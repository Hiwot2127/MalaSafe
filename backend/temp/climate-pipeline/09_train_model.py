"""Stage 9: Train the malaria + climate model.

Input : processed/train_ready.parquet  (60,940 rows x 88 cols, from Stage 8)
Output:
  models/lightgbm_main.txt        -- Poisson regression on Positive count
  models/lightgbm_q10.txt         -- 10th percentile (for confidence interval)
  models/lightgbm_q90.txt         -- 90th percentile
  models/lightgbm_coldstart.txt   -- no-lag fallback for new facilities / first months
  models/risk_thresholds.json     -- per-ADM3 quantile cutoffs (low/mod/high/very_high)
  models/model_card.json          -- version, train date, metric snapshot, dependencies
  reports/model_report.md         -- human-readable evaluation
  reports/predictions_test.parquet -- test-set predictions for audit
  reports/shap_importance.csv     -- global mean |SHAP| top-50
  reports/calibration_test.png    -- decile calibration chart

Design:
  - target          : Positive count
  - objective       : poisson (with init_score = log(Tests+1) as exposure offset)
  - categoricals    : organisationunitid, ADM3_PCODE, Zone passed natively to LightGBM
  - features        : everything in manifest minus leakage cols (Positive/Tests/etc)
  - lag NaNs        : LightGBM handles missing natively (split direction learned)
  - cold-start      : separate model trained on is_warm=False rows w/o lag features
  - confidence      : prediction interval width from q10/q90 -> 0..1 confidence_score
  - risk binning    : per-woreda p50/p75/p95 (train rows only), region/global fallback
"""
from __future__ import annotations

import json
import warnings
from datetime import datetime, timezone
from pathlib import Path

import lightgbm as lgb
import numpy as np
import pandas as pd
from scipy.stats import pearsonr, spearmanr
from sklearn.metrics import mean_absolute_error, mean_squared_error

warnings.filterwarnings("ignore", category=UserWarning, module="lightgbm")

ROOT = Path("/Users/danielbogale/Documents/second-brain/temp/climate-pipeline")
PROC = ROOT / "processed"
MODELS = ROOT / "models"
REPORTS = ROOT / "reports"
MODELS.mkdir(exist_ok=True)
REPORTS.mkdir(exist_ok=True)

MODEL_VERSION = "v1.0.0"
RANDOM_SEED = 42


# ---------------------------------------------------------------------------
# 1. Load + assemble feature matrix
# ---------------------------------------------------------------------------
def load_data() -> tuple[pd.DataFrame, dict]:
    df = pd.read_parquet(PROC / "train_ready.parquet")
    manifest = json.loads((PROC / "feature_manifest.json").read_text())
    print(f"loaded {len(df):,} rows x {df.shape[1]} cols")
    return df, manifest


def build_feature_set(df: pd.DataFrame, manifest: dict) -> tuple[list[str], list[str]]:
    """Returns (all_features, categorical_features). All_features is ordered."""
    leakage = set(manifest["leakage_cols"])
    drop_cols = leakage | {"split", "Period_Gregorian_start", "Period_Gregorian_end",
                            "Period", "Eth_Month_Year", "Woreda", "_src_year",
                            "log_positive", "log_tests"}
    feats = [c for c in df.columns if c not in drop_cols]

    cat_high = manifest["categorical_high"]      # Zone, ADM3_PCODE, organisationunitid
    cat_low = manifest["categorical_low"]        # region_* and csrc_* one-hots
    # cat_low are already 0/1 int from get_dummies -> treat as numeric, no cast needed.
    # cat_high are strings -> need .astype('category') for LightGBM.
    for col in cat_high:
        df[col] = df[col].astype("category")
    return feats, cat_high


# ---------------------------------------------------------------------------
# 2. Train the main Poisson model
# ---------------------------------------------------------------------------
def train_main_model(
    df: pd.DataFrame, feats: list[str], cat_high: list[str]
) -> lgb.Booster:
    warm = df[df["is_warm"]].copy()
    tr = warm[warm["split"] == "train"]
    va = warm[warm["split"] == "val"]
    print(f"  train: {len(tr):,} | val: {len(va):,} (warm rows only)")

    dtrain = lgb.Dataset(
        tr[feats], label=tr["Positive"],
        init_score=tr["log_tests"].values,
        categorical_feature=cat_high,
        free_raw_data=False,
    )
    dval = lgb.Dataset(
        va[feats], label=va["Positive"],
        init_score=va["log_tests"].values,
        categorical_feature=cat_high,
        reference=dtrain,
        free_raw_data=False,
    )

    params = {
        "objective": "poisson",
        "metric": ["rmse", "poisson"],
        "learning_rate": 0.03,
        "num_leaves": 63,
        "min_data_in_leaf": 50,
        "feature_fraction": 0.85,
        "bagging_fraction": 0.85,
        "bagging_freq": 5,
        "lambda_l1": 0.1,
        "lambda_l2": 0.1,
        "verbose": -1,
        "seed": RANDOM_SEED,
    }
    print("  training Poisson model ...")
    booster = lgb.train(
        params, dtrain,
        num_boost_round=3000,
        valid_sets=[dtrain, dval],
        valid_names=["train", "val"],
        callbacks=[lgb.early_stopping(100), lgb.log_evaluation(period=0)],
    )
    print(f"  best iter: {booster.best_iteration}  val RMSE: {booster.best_score['val']['rmse']:.2f}")
    return booster


# ---------------------------------------------------------------------------
# 3. Quantile sibling models (for confidence interval)
# ---------------------------------------------------------------------------
def train_quantile_model(
    df: pd.DataFrame, feats: list[str], cat_high: list[str], alpha: float, best_iter: int
) -> lgb.Booster:
    warm = df[df["is_warm"]].copy()
    tr = warm[warm["split"] == "train"]
    va = warm[warm["split"] == "val"]
    y_tr = np.log1p(tr["Positive"].values)
    y_va = np.log1p(va["Positive"].values)

    dtrain = lgb.Dataset(tr[feats], label=y_tr, categorical_feature=cat_high, free_raw_data=False)
    dval = lgb.Dataset(va[feats], label=y_va, categorical_feature=cat_high, reference=dtrain, free_raw_data=False)
    params = {
        "objective": "quantile",
        "alpha": alpha,
        "metric": "quantile",
        "learning_rate": 0.03,
        "num_leaves": 63,
        "min_data_in_leaf": 50,
        "feature_fraction": 0.85,
        "bagging_fraction": 0.85,
        "bagging_freq": 5,
        "verbose": -1,
        "seed": RANDOM_SEED,
    }
    print(f"  training quantile model alpha={alpha} ...")
    booster = lgb.train(
        params, dtrain, num_boost_round=best_iter or 1500,
        valid_sets=[dval], callbacks=[lgb.early_stopping(100), lgb.log_evaluation(period=0)],
    )
    return booster


# ---------------------------------------------------------------------------
# 4. Cold-start sub-model (no lag features)
# ---------------------------------------------------------------------------
def train_coldstart_model(
    df: pd.DataFrame, feats: list[str], cat_high: list[str]
) -> tuple[lgb.Booster, list[str]]:
    """Train on rows without case-history lags. Uses climate/geo/temporal only."""
    drop_lag = lambda c: any(c.startswith(p) for p in (
        "positive_lag", "tests_lag", "positivity_rate_lag"))
    coldfeats = [c for c in feats if not drop_lag(c)]

    tr = df[df["split"] == "train"]
    va = df[df["split"] == "val"]
    print(f"  cold-start features: {len(coldfeats)} (no target lags)")
    print(f"  cold-start train: {len(tr):,} | val: {len(va):,}")

    dtrain = lgb.Dataset(tr[coldfeats], label=tr["Positive"],
                         init_score=tr["log_tests"].values,
                         categorical_feature=cat_high, free_raw_data=False)
    dval = lgb.Dataset(va[coldfeats], label=va["Positive"],
                       init_score=va["log_tests"].values,
                       categorical_feature=cat_high, reference=dtrain, free_raw_data=False)
    params = {
        "objective": "poisson", "metric": "rmse",
        "learning_rate": 0.05, "num_leaves": 31,
        "min_data_in_leaf": 100, "feature_fraction": 0.9,
        "bagging_fraction": 0.85, "bagging_freq": 5,
        "lambda_l1": 0.1, "lambda_l2": 0.1, "verbose": -1, "seed": RANDOM_SEED,
    }
    booster = lgb.train(params, dtrain, num_boost_round=1500,
                        valid_sets=[dval], callbacks=[lgb.early_stopping(100), lgb.log_evaluation(period=0)])
    return booster, coldfeats


# ---------------------------------------------------------------------------
# 5. Risk binning thresholds (per ADM3_PCODE, fallback Region, fallback global)
# ---------------------------------------------------------------------------
def compute_risk_thresholds(df: pd.DataFrame) -> dict:
    train = df[df["split"] == "train"].copy()
    region_col = next((c for c in df.columns if c == "Region"), None)
    # Region was one-hot encoded. Reconstruct from region_* columns.
    region_cols = [c for c in df.columns if c.startswith("region_")]
    train["_region"] = train[region_cols].idxmax(axis=1).str.removeprefix("region_")

    out: dict[str, dict] = {}

    # Pass 1: per ADM3_PCODE with >=12 train months and median > 0
    per_w = train.groupby("ADM3_PCODE")["Positive"]
    for pcode, vals in per_w:
        if len(vals) >= 12 and vals.median() > 0:
            p50, p75, p95 = np.quantile(vals, [0.5, 0.75, 0.95])
            out[str(pcode)] = {"p50": float(p50), "p75": float(p75),
                                "p95": float(p95), "source": "woreda"}

    # Pass 2: regional fallback
    per_r = train.groupby("_region")["Positive"]
    region_thr: dict[str, dict] = {}
    for region, vals in per_r:
        p50, p75, p95 = np.quantile(vals, [0.5, 0.75, 0.95])
        region_thr[region] = {"p50": float(p50), "p75": float(p75),
                              "p95": float(p95), "source": "region"}

    # Pass 3: global fallback
    gp50, gp75, gp95 = np.quantile(train["Positive"], [0.5, 0.75, 0.95])
    global_thr = {"p50": float(gp50), "p75": float(gp75),
                  "p95": float(gp95), "source": "global"}

    # Fill in missing ADM3s with their region's threshold; if no region, global.
    all_pcodes = train.dropna(subset=["ADM3_PCODE"])["ADM3_PCODE"].unique()
    for pcode in all_pcodes:
        if str(pcode) in out:
            continue
        sub = train[train["ADM3_PCODE"] == pcode]
        if len(sub) and sub["_region"].iloc[0] in region_thr:
            out[str(pcode)] = region_thr[sub["_region"].iloc[0]]
        else:
            out[str(pcode)] = global_thr

    payload = {
        "_meta": {
            "version": MODEL_VERSION,
            "train_rows": int(len(train)),
            "woreda_count": sum(1 for v in out.values() if v["source"] == "woreda"),
            "region_fallback_count": sum(1 for v in out.values() if v["source"] == "region"),
            "global_fallback_count": sum(1 for v in out.values() if v["source"] == "global"),
        },
        "by_pcode": out,
        "by_region": region_thr,
        "global": global_thr,
    }
    print(f"  thresholds: {payload['_meta']['woreda_count']} per-woreda "
          f"| {payload['_meta']['region_fallback_count']} region-fallback "
          f"| {payload['_meta']['global_fallback_count']} global-fallback")
    return payload


def classify_risk(pred: float, pcode: str | None, thresholds: dict) -> str:
    t = thresholds["by_pcode"].get(str(pcode)) if pcode else None
    if t is None:
        t = thresholds["global"]
    if pred <= t["p50"]:
        return "low"
    if pred <= t["p75"]:
        return "moderate"
    if pred <= t["p95"]:
        return "high"
    return "very_high"


# ---------------------------------------------------------------------------
# 6. Evaluation
# ---------------------------------------------------------------------------
def evaluate(
    df: pd.DataFrame, feats: list[str], cat_high: list[str],
    booster: lgb.Booster, q10: lgb.Booster, q90: lgb.Booster,
    cold: lgb.Booster, cold_feats: list[str],
    thresholds: dict
) -> dict:
    test = df[df["split"] == "test"].copy()
    warm_test = test[test["is_warm"]]
    cold_test = test[~test["is_warm"]]
    print(f"  test rows: {len(test):,}  (warm {len(warm_test):,} | cold {len(cold_test):,})")

    # Main predictions on warm rows
    raw_warm = booster.predict(warm_test[feats], num_iteration=booster.best_iteration)
    # Poisson with init_score: prediction = exp(raw + init_score). LightGBM handles this
    # internally when init_score is passed at predict time; without it, we add manually.
    pred_warm = raw_warm * np.exp(warm_test["log_tests"].values)  # exp(log_tests) factor

    # Cold predictions
    if len(cold_test):
        raw_cold = cold.predict(cold_test[cold_feats], num_iteration=cold.best_iteration)
        pred_cold = raw_cold * np.exp(cold_test["log_tests"].values)
    else:
        pred_cold = np.array([])

    # Stitch back together
    preds = pd.Series(np.nan, index=test.index)
    preds.loc[warm_test.index] = pred_warm
    if len(cold_test):
        preds.loc[cold_test.index] = pred_cold

    # Quantile predictions (log scale) -> convert to count scale, on warm only
    log_q10 = q10.predict(warm_test[feats], num_iteration=q10.best_iteration)
    log_q90 = q90.predict(warm_test[feats], num_iteration=q90.best_iteration)
    pred_q10 = np.expm1(log_q10)
    pred_q90 = np.expm1(log_q90)
    # Confidence: 1 - (q90 - q10) / (pred + 1), clipped to [0, 1]
    conf_warm = np.clip(1 - (pred_q90 - pred_q10) / (pred_warm + 1), 0, 1)
    confs = pd.Series(0.3, index=test.index)  # cold-start prior: 0.3
    confs.loc[warm_test.index] = conf_warm

    test["pred"] = preds.values
    test["confidence"] = confs.values
    test["risk_level"] = [classify_risk(p, c, thresholds)
                          for p, c in zip(test["pred"], test["ADM3_PCODE"])]

    y_true = test["Positive"].values
    y_pred = test["pred"].values

    # Metrics
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    mae = float(mean_absolute_error(y_true, y_pred))
    nonzero = y_true > 0
    mape = float(np.mean(np.abs((y_true[nonzero] - y_pred[nonzero]) / y_true[nonzero]) * 100))
    pearson_log = float(pearsonr(np.log1p(y_true), np.log1p(y_pred))[0])
    spearman = float(spearmanr(y_true, y_pred)[0])

    # Decile calibration
    df_cal = pd.DataFrame({"actual": y_true, "pred": y_pred})
    df_cal["decile"] = pd.qcut(df_cal["pred"], 10, labels=False, duplicates="drop")
    cal = df_cal.groupby("decile").agg(mean_pred=("pred", "mean"),
                                        mean_actual=("actual", "mean"),
                                        n=("actual", "size")).reset_index()

    # Per-region MAE
    region_cols = [c for c in test.columns if c.startswith("region_")]
    test["_region"] = test[region_cols].idxmax(axis=1).str.removeprefix("region_")
    per_region = (test.groupby("_region")
                  .apply(lambda g: pd.Series({
                      "n": len(g),
                      "mae": mean_absolute_error(g["Positive"], g["pred"]),
                      "actual_mean": g["Positive"].mean(),
                      "pred_mean":   g["pred"].mean(),
                  }))
                  .reset_index()
                  .sort_values("mae", ascending=False))

    # Risk-level distribution
    risk_dist = test["risk_level"].value_counts().reindex(
        ["low", "moderate", "high", "very_high"], fill_value=0)

    # Save artifacts
    test.to_parquet(REPORTS / "predictions_test.parquet", index=False)
    cal.to_csv(REPORTS / "calibration_test.csv", index=False)

    # Calibration chart
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(figsize=(6, 6))
    ax.plot(cal["mean_pred"], cal["mean_actual"], "o-", label="model")
    lim = max(cal["mean_pred"].max(), cal["mean_actual"].max())
    ax.plot([0, lim], [0, lim], "k--", alpha=0.4, label="ideal")
    ax.set_xlabel("mean predicted (per decile)")
    ax.set_ylabel("mean actual (per decile)")
    ax.set_title("Decile calibration — test set")
    ax.legend()
    fig.tight_layout()
    fig.savefig(REPORTS / "calibration_test.png", dpi=120)
    plt.close(fig)

    return {
        "rmse": rmse, "mae": mae, "mape": mape,
        "pearson_log": pearson_log, "spearman": spearman,
        "calibration": cal, "per_region": per_region, "risk_dist": risk_dist,
        "n_test": int(len(test)), "n_warm": int(len(warm_test)), "n_cold": int(len(cold_test)),
    }


# ---------------------------------------------------------------------------
# 7. SHAP global importance + per-feature direction
# ---------------------------------------------------------------------------
def shap_importance(booster: lgb.Booster, df: pd.DataFrame, feats: list[str]) -> pd.DataFrame:
    """Compute mean |SHAP| over a sample of warm test rows."""
    import shap
    warm_test = df[(df["split"] == "test") & df["is_warm"]]
    sample = warm_test.sample(min(2000, len(warm_test)), random_state=RANDOM_SEED)
    explainer = shap.TreeExplainer(booster)
    sv = explainer.shap_values(sample[feats])
    imp = pd.DataFrame({"feature": feats,
                        "mean_abs_shap": np.abs(sv).mean(axis=0),
                        "mean_shap": sv.mean(axis=0)})
    imp = imp.sort_values("mean_abs_shap", ascending=False).reset_index(drop=True)
    imp.to_csv(REPORTS / "shap_importance.csv", index=False)
    return imp


# ---------------------------------------------------------------------------
# 8. Markdown report
# ---------------------------------------------------------------------------
def write_report(metrics: dict, shap_df: pd.DataFrame, thresholds: dict,
                 booster: lgb.Booster, cold: lgb.Booster) -> dict:
    lines: list[str] = []
    lines.append(f"# Model Report — {MODEL_VERSION}\n")
    lines.append(f"_Generated: {datetime.now(timezone.utc).isoformat()}_\n")

    lines.append("## Headline metrics (test set)\n")
    lines.append("| metric | value |")
    lines.append("|---|---|")
    lines.append(f"| RMSE (counts)        | {metrics['rmse']:.2f} |")
    lines.append(f"| MAE  (counts)        | {metrics['mae']:.2f} |")
    lines.append(f"| MAPE (non-zero, %)   | {metrics['mape']:.1f} |")
    lines.append(f"| Pearson r (log1p)    | {metrics['pearson_log']:.3f} |")
    lines.append(f"| Spearman r           | {metrics['spearman']:.3f} |")
    lines.append(f"| n test rows          | {metrics['n_test']:,} (warm {metrics['n_warm']:,} / cold {metrics['n_cold']:,}) |")

    pass_spearman = metrics["spearman"] >= 0.7
    lines.append(f"\n**Pass gate (Spearman ≥ 0.7):** {'✅ PASS' if pass_spearman else '❌ FAIL'}")

    lines.append("\n## Risk-level distribution on test set\n")
    rd = metrics["risk_dist"]
    lines.append("| risk_level | count | pct |")
    lines.append("|---|---|---|")
    total = rd.sum()
    for level, n in rd.items():
        lines.append(f"| {level} | {n:,} | {n/total*100:.1f}% |")

    lines.append("\n## Decile calibration\n")
    lines.append(metrics["calibration"].round(2).to_markdown(index=False))
    lines.append("\n![calibration](calibration_test.png)\n")

    lines.append("\n## Per-region MAE (worst first)\n")
    pr = metrics["per_region"].copy()
    pr_global_med = pr["mae"].median()
    pr["mae_x_median"] = pr["mae"] / pr_global_med if pr_global_med else np.nan
    lines.append(pr.round(2).to_markdown(index=False))
    flagged = pr[pr["mae_x_median"] > 5]
    lines.append(f"\n**Regions with MAE > 5× median:** {len(flagged)} "
                 f"{'(flagged for review)' if len(flagged) else '(none ✅)'}")

    lines.append("\n## Top-20 features (global mean |SHAP|)\n")
    top20 = shap_df.head(20).copy()
    top20["pct_of_total"] = top20["mean_abs_shap"] / shap_df["mean_abs_shap"].sum() * 100
    lines.append(top20.round(4).to_markdown(index=False))

    # Check that at least one climate-derived feature is in top 5
    climate_kws = ("Rainfall", "Temp", "Humidity", "rainfall_anomaly", "temp_anomaly", "Elevation")
    top5_features = top20["feature"].head(5).tolist()
    has_climate = any(any(kw in f for kw in climate_kws) for f in top5_features)
    lines.append(f"\n**Pass gate (≥1 climate feature in top-5 SHAP):** {'✅ PASS' if has_climate else '❌ FAIL'}")

    lines.append("\n## Risk thresholds summary\n")
    m = thresholds["_meta"]
    lines.append(f"- per-woreda thresholds: {m['woreda_count']}")
    lines.append(f"- region fallback: {m['region_fallback_count']}")
    lines.append(f"- global fallback: {m['global_fallback_count']}")
    lines.append(f"- global cutoffs: p50={thresholds['global']['p50']:.0f} "
                 f"p75={thresholds['global']['p75']:.0f} p95={thresholds['global']['p95']:.0f}")

    lines.append("\n## Model summary\n")
    lines.append(f"- main booster: {booster.num_trees()} trees")
    lines.append(f"- cold-start booster: {cold.num_trees()} trees")

    (REPORTS / "model_report.md").write_text("\n".join(lines))

    return {"pass_spearman": pass_spearman, "pass_climate_top5": has_climate}


# ---------------------------------------------------------------------------
# 9. Orchestrate
# ---------------------------------------------------------------------------
def main() -> None:
    print("=== Stage 9: model training ===\n")
    df, manifest = load_data()
    feats, cat_high = build_feature_set(df, manifest)
    print(f"  using {len(feats)} features ({len(cat_high)} high-card categorical)\n")

    # Main
    main_model = train_main_model(df, feats, cat_high)
    main_model.save_model(str(MODELS / "lightgbm_main.txt"))
    best_iter = main_model.best_iteration

    # Quantiles
    q10 = train_quantile_model(df, feats, cat_high, alpha=0.1, best_iter=best_iter)
    q10.save_model(str(MODELS / "lightgbm_q10.txt"))
    q90 = train_quantile_model(df, feats, cat_high, alpha=0.9, best_iter=best_iter)
    q90.save_model(str(MODELS / "lightgbm_q90.txt"))

    # Cold-start
    cold_model, cold_feats = train_coldstart_model(df, feats, cat_high)
    cold_model.save_model(str(MODELS / "lightgbm_coldstart.txt"))

    # Risk thresholds
    print("\ncomputing risk thresholds ...")
    thresholds = compute_risk_thresholds(df)
    (MODELS / "risk_thresholds.json").write_text(json.dumps(thresholds, indent=2))

    # Evaluate
    print("\nevaluating on test set ...")
    metrics = evaluate(df, feats, cat_high, main_model, q10, q90,
                       cold_model, cold_feats, thresholds)

    # SHAP
    print("computing SHAP importance ...")
    shap_df = shap_importance(main_model, df, feats)

    # Report + gates
    print("writing report ...")
    gates = write_report(metrics, shap_df, thresholds, main_model, cold_model)

    # Model card
    card = {
        "version": MODEL_VERSION,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "input": str(PROC / "train_ready.parquet"),
        "rows": {"train": int((df["split"] == "train").sum()),
                 "val":   int((df["split"] == "val").sum()),
                 "test":  int((df["split"] == "test").sum())},
        "features": feats,
        "categorical_high": cat_high,
        "cold_start_features": cold_feats,
        "metrics": {k: v for k, v in metrics.items() if k not in ("calibration", "per_region", "risk_dist")},
        "gates": gates,
        "dependencies": {
            "lightgbm":   lgb.__version__,
            "pandas":     pd.__version__,
            "numpy":      np.__version__,
        },
        "notes": [
            "MaxTemp/MinTemp are AvgTemp ± 5°C proxy (monthly-means path).",
            "6% of training rows have imputed climate; csrc_* one-hots let the model weight them.",
            "Cold-start model uses no target lags — for first-3-month-per-facility or brand-new facilities.",
        ],
    }
    (MODELS / "model_card.json").write_text(json.dumps(card, indent=2, default=str))

    print("\n=== summary ===")
    print(f"  spearman: {metrics['spearman']:.3f}  (gate >= 0.7 {'PASS' if gates['pass_spearman'] else 'FAIL'})")
    print(f"  rmse:     {metrics['rmse']:.2f}")
    print(f"  mae:      {metrics['mae']:.2f}")
    print(f"  climate-in-top5-SHAP: {'PASS' if gates['pass_climate_top5'] else 'FAIL'}")
    print(f"\nartifacts:")
    print(f"  models/    lightgbm_main.txt, lightgbm_q10.txt, lightgbm_q90.txt,")
    print(f"             lightgbm_coldstart.txt, risk_thresholds.json, model_card.json,")
    print(f"             feature_phrasebook.py")
    print(f"  reports/   model_report.md, predictions_test.parquet,")
    print(f"             shap_importance.csv, calibration_test.{{png,csv}}")


if __name__ == "__main__":
    main()
