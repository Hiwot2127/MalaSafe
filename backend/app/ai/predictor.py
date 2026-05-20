"""LightGBM malaria predictor.

Loads the trained boosters + thresholds + baselines at startup, exposes a
single `predict_one(...)` that returns the four fields the MalaSafe Prediction
table expects: risk_level, prediction_score, confidence_score, prediction_reason.

Concurrency: stateless after load; safe to call from FastAPI request handlers.
Cost: ~5ms per call on a Mac after the first invocation.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Iterable

import lightgbm as lgb
import numpy as np
import pandas as pd

from app.ai.features import FeatureContext, build_features, to_dataframe
from app.ai.phrasebook import phrase_for


@dataclass
class PredictionResult:
    risk_level: str          # 'low' | 'moderate' | 'high' | 'very_high'
    prediction_score: float   # raw expected case count
    confidence_score: float   # 0..1
    prediction_reason: str    # human-readable, up to 200 chars
    is_warm: bool             # whether main model (vs cold-start) was used
    target_month: date
    debug: dict | None = None


class MalariaPredictor:
    def __init__(self, model_dir: Path):
        model_dir = Path(model_dir)
        self.dir = model_dir
        print(f"[predictor] loading from {model_dir}")

        self.main = lgb.Booster(model_file=str(model_dir / "lightgbm_main.txt"))
        self.q10  = lgb.Booster(model_file=str(model_dir / "lightgbm_q10.txt"))
        self.q90  = lgb.Booster(model_file=str(model_dir / "lightgbm_q90.txt"))
        self.cold = lgb.Booster(model_file=str(model_dir / "lightgbm_coldstart.txt"))
        self.thresholds = self._load_json(model_dir / "risk_thresholds.json")
        self.card = self._load_json(model_dir / "model_card.json")
        self.ctx = FeatureContext.load(model_dir)
        self.feats = self.card["features"]
        self.cold_feats = self.card.get("cold_start_features", [])
        # Surface model + thresholds versions so the dashboard API can label
        # which artifact produced a given prediction. Missing `_meta.version`
        # in the thresholds JSON falls back to the model card version — both
        # are written by the training pipeline, so they should agree.
        self.model_version: str = str(self.card.get("version") or "unknown")
        self.thresholds_version: str = str(
            (self.thresholds.get("_meta") or {}).get("version")
            or self.model_version
        )
        v = self.model_version.lstrip('v')
        print(f"[predictor] loaded v{v} (thresholds={self.thresholds_version}): "
              f"{len(self.feats)} feats, {self.main.num_trees()} trees")

    @staticmethod
    def _load_json(path: Path) -> dict:
        """Read a JSON file with a useful error if it's missing or malformed.

        Without this, a missing/corrupt artifact crashes the predictor with a
        bare FileNotFoundError or JSONDecodeError - the trace points at the
        load site, not at the model-dir misconfiguration that caused it.
        """
        try:
            return json.loads(path.read_text())
        except FileNotFoundError as e:
            raise FileNotFoundError(
                f"Predictor artifact missing: {path}. "
                "Check settings.MODEL_PATH and that the model package "
                "(lightgbm_*.txt, risk_thresholds.json, model_card.json) "
                "is on disk."
            ) from e
        except json.JSONDecodeError as e:
            raise ValueError(
                f"Predictor artifact {path} is not valid JSON ({e.msg}). "
                "Re-export the trained model package or restore the file from git."
            ) from e

    # ----- core API ---------------------------------------------------------
    def predict_one(
        self,
        district,
        target_month: date,
        malaria_history: Iterable,
        climate_history: Iterable,
        tests_hint: float | None = None,
        ec_month_name: str | None = None,
    ) -> PredictionResult:
        # Materialise so we can inspect for a tests_hint default without
        # exhausting a generator before build_features() sees it.
        malaria_history = list(malaria_history)

        # `tests_hint` defaults to the latest non-null `tests` value on the
        # malaria_history rows (newest by year/month). Falls back to the
        # legacy implicit default of 0.0 if none is present, preserving the
        # exposure-factor behaviour for cold-start districts.
        if tests_hint is None:
            latest_tests: float | None = None
            for m in sorted(
                malaria_history,
                key=lambda r: (r.year, r.month),
                reverse=True,
            ):
                t = getattr(m, "tests", None)
                if t is not None:
                    latest_tests = float(t)
                    break
            tests_hint = latest_tests if latest_tests is not None else 0.0

        # 1. Build features
        f, is_warm = build_features(
            district=district,
            target_month=target_month,
            malaria_history=malaria_history,
            climate_history=climate_history,
            tests_hint=tests_hint,
            ec_month_name=ec_month_name,
            region_label=district.region,
            climate_source_label="direct",
            ctx=self.ctx,
        )

        # 2. Pick booster + feature set
        if is_warm:
            df = to_dataframe(f, self.feats)
            raw = self.main.predict(df, num_iteration=self.main.best_iteration)[0]
            pred = float(raw) * float(max(tests_hint, 1.0))  # exposure factor
        else:
            df = to_dataframe(f, self.cold_feats)
            raw = self.cold.predict(df, num_iteration=self.cold.best_iteration)[0]
            pred = float(raw) * float(max(tests_hint, 1.0))

        # 3. Confidence - quantile interval (warm only; cold gets a flat prior)
        if is_warm:
            df_full = to_dataframe(f, self.feats)
            q10_log = float(self.q10.predict(df_full, num_iteration=self.q10.best_iteration)[0])
            q90_log = float(self.q90.predict(df_full, num_iteration=self.q90.best_iteration)[0])
            q10_c = float(np.expm1(q10_log))
            q90_c = float(np.expm1(q90_log))
            spread = max(q90_c - q10_c, 0.0)
            confidence = float(np.clip(1.0 - spread / (pred + 1.0), 0.0, 1.0))
        else:
            confidence = 0.3

        # 4. Risk level (per-woreda thresholds, region/global fallback)
        risk = self._classify_risk(pred, getattr(district, "adm3_pcode", None) or district.district_code,
                                    district.region)

        # 5. Reason via SHAP top-3 + phrasebook
        reason = self._explain(df if is_warm else None, f, is_warm)

        return PredictionResult(
            risk_level=risk,
            prediction_score=round(pred, 2),
            confidence_score=round(confidence, 3),
            prediction_reason=reason,
            is_warm=is_warm,
            target_month=target_month,
        )

    # ----- helpers ----------------------------------------------------------
    def _classify_risk(self, pred: float, pcode: str | None, region: str | None) -> str:
        t = (self.thresholds.get("by_pcode", {}).get(str(pcode))
             or self.thresholds.get("by_region", {}).get(region)
             or self.thresholds["global"])
        if pred <= t["p50"]:
            return "low"
        if pred <= t["p75"]:
            return "moderate"
        if pred <= t["p95"]:
            return "high"
        return "very_high"

    def _explain(self, df: pd.DataFrame | None, feat_dict: dict, is_warm: bool) -> str:
        if not is_warm:
            return "Cold-start prediction - limited case history; uses climate + geography only."
        # Compute SHAP via the booster's pred_contrib (no extra dep needed)
        contrib = self.main.predict(df, num_iteration=self.main.best_iteration,
                                     pred_contrib=True)[0]
        # Last column is the bias; drop it.
        sv = contrib[:-1]
        names = self.feats
        # Top 3 by |contribution|
        idx = np.argsort(-np.abs(sv))[:3]
        phrases: list[str] = []
        for i in idx:
            p = phrase_for(names[i], float(sv[i]))
            if p:
                phrases.append(p)
        if not phrases:
            return "Driven by case-history and seasonal context."
        return "; ".join(phrases[:3])[:200]
