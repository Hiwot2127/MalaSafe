"""Stage 2: Resolve malaria CSV woreda text names -> ADM3_PCODE.

Strategy:
  - Normalize woreda names (strip suffixes: Woreda, Town, Sub City, etc.)
  - Normalize region names (strip 'Region', 'City Administration'; map known variants
    like Gambella<->Gambela)
  - Match within region cohort (zone is unreliable: malaria DHIS2 hierarchy has
    147 zones, reference has 92, and DHIS2 puts some sub-city units in the zone column)
  - 3-tier within region cohort: exact normalized -> fuzzy >= 88 -> manual review

Outputs:
  crosswalk/facility_to_pcode.csv  -- auto-resolved rows
  crosswalk/manual_review.csv      -- unmatched/ambiguous rows for user input
"""
from __future__ import annotations
import re
import unicodedata
from pathlib import Path
from collections import defaultdict
import pandas as pd
from rapidfuzz import process, fuzz

ROOT = Path("/Users/danielbogale/Documents/second-brain")
REF_CSV = ROOT / "temp" / "reference-geo-name" / "reference_geo_names.csv"
MAL_CSVS = sorted((ROOT / "temp").glob("final_processed_df_*EC.csv"))
OUT_DIR = ROOT / "temp" / "climate-pipeline" / "crosswalk"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Suffixes to strip (case-insensitive). Order matters - longer first.
SUFFIXES = [
    "city administration",
    "city adminstration",      # observed misspelling
    "city admin",
    "sub city",
    "subcity",
    "town administration",
    "town admin",
    "health office",
    "health post",
    "wereda office",
    "woreda office",
    "special woreda",
    "special",
    "woreda",
    "worda",                    # observed misspelling
    "wereda",                   # variant
    "town",
    "city",
    "kentiba",                  # Amharic for mayoralty / city
    "wor ho",                   # WorHO = Woreda Health Office
    "worho",
    "woho",
    "office",
    "(am)", "(tg)", "(or)", "(sn)", "(af)", "(so)",   # region tags in reference
]

# Common transliteration normalizations
TRANSLIT = [
    (r"\bgne'?a\b", "gnea"),
    (r"\bgnea\b", "gnea"),
    (r"\bda'a\b", "daa"),
    (r"\bginde\s+beret\b", "gindeberet"),
    (r"\babe\s+dongoro\b", "abe dengoro"),
]

# Region name normalization. Malaria CSV uses long forms; reference uses short forms.
REGION_SUFFIXES = ["region", "city administration"]
REGION_ALIASES = {
    # malaria-side label  ->  reference-side canonical label
    "gambella": "gambela",
    "benishangul gumuz": "benishangul gumz",
    "central ethiopian": "central ethiopia",
    "south ethiopia": "southern ethiopi",   # ref has "southern ethiopi" (typo in source)
    "southern ethiopia": "southern ethiopi",
}


def normalize_region(s: str) -> str:
    if not isinstance(s, str):
        return ""
    s = deaccent(s).lower().strip()
    for suf in REGION_SUFFIXES:
        if s.endswith(" " + suf):
            s = s[: -len(suf)].rstrip()
            break
    s = re.sub(r"\s+", " ", s).strip()
    return REGION_ALIASES.get(s, s)


def deaccent(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))


def normalize(s: str) -> str:
    if not isinstance(s, str):
        return ""
    s = deaccent(s).lower().strip()
    # Strip suffixes (repeatedly, since some have layered suffixes)
    changed = True
    while changed:
        changed = False
        for suf in SUFFIXES:
            if s.endswith(" " + suf) or s == suf:
                s = s[: -len(suf)].rstrip()
                changed = True
                break
    # Apply known transliteration normalizations
    for pat, repl in TRANSLIT:
        s = re.sub(pat, repl, s)
    # Strip punctuation, collapse whitespace
    s = re.sub(r"[^a-z0-9 ]+", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def main() -> None:
    print("Loading reference...")
    ref = pd.read_csv(REF_CSV)
    ref["_norm"] = ref["woreda"].map(normalize)
    ref["_region_norm"] = ref["region"].map(normalize_region)
    # Build lookup structures
    exact_by_norm: dict[str, list[int]] = defaultdict(list)
    for idx, row in ref.iterrows():
        exact_by_norm[row["_norm"]].append(idx)
    # Per region cohort -> list of (normalized_name, ref_idx)
    cohort_index: dict[str, list[tuple[str, int]]] = defaultdict(list)
    for idx, row in ref.iterrows():
        cohort_index[row["_region_norm"]].append((row["_norm"], idx))
    print(f"  reference rows: {len(ref)}, unique normalized names: {len(exact_by_norm)}")
    print(f"  reference regions: {sorted(cohort_index.keys())}")

    # Load malaria unique (region, zone, woreda) triples from both years
    print("\nLoading malaria org units...")
    frames = [pd.read_csv(p, usecols=["orgunitlevel2", "orgunitlevel3", "organisationunitname"]) for p in MAL_CSVS]
    mal = pd.concat(frames, ignore_index=True).drop_duplicates()
    mal.columns = ["region", "zone", "woreda_raw"]
    mal["_woreda_norm"] = mal["woreda_raw"].map(normalize)
    mal["_region_norm"] = mal["region"].map(normalize_region)
    print(f"  unique (region, zone, woreda) triples: {len(mal)}")
    print(f"  unique woreda_raw values: {mal['woreda_raw'].nunique()}")
    print(f"  malaria regions (normalized): {sorted(mal['_region_norm'].unique())}")
    # Sanity: every malaria region should appear in reference
    missing_regions = set(mal["_region_norm"].unique()) - set(cohort_index.keys())
    if missing_regions:
        print(f"  WARNING: malaria regions not in reference: {missing_regions}")

    # Resolution
    matches = []
    review = []
    n_exact, n_exact_in_cohort, n_fuzzy_in_cohort, n_fuzzy_global, n_suggested, n_unmatched = 0, 0, 0, 0, 0, 0
    AUTO_THRESHOLD = 88              # within region cohort -> auto-accept
    SUGGEST_THRESHOLD = 82           # within region cohort -> suggest in manual review
    FUZZY_GLOBAL_THRESHOLD = 92      # across regions (high to avoid noise)

    for _, row in mal.iterrows():
        wraw = row["woreda_raw"]
        wnorm = row["_woreda_norm"]
        region_n = row["_region_norm"]
        cohort = cohort_index.get(region_n, [])

        match_type = None
        match_idx = None
        confidence = None
        candidates_str = ""

        # Tier 1: exact normalized within cohort
        for cn, ridx in cohort:
            if cn == wnorm and wnorm != "":
                match_type = "exact_in_cohort"
                match_idx = ridx
                confidence = 100
                break

        # Tier 1b: exact normalized globally (ambiguous if >1 region matches)
        if match_idx is None and wnorm in exact_by_norm:
            candidate_idxs = exact_by_norm[wnorm]
            if len(candidate_idxs) == 1:
                match_type = "exact_global"
                match_idx = candidate_idxs[0]
                confidence = 95
            # else: ambiguous, will fall through to manual

        # Tier 2: fuzzy within cohort
        cohort_suggestion = None  # (ridx, score) if score in suggest band
        if match_idx is None and cohort and wnorm:
            choices = [cn for cn, _ in cohort]
            best = process.extractOne(wnorm, choices, scorer=fuzz.WRatio)
            if best and best[1] >= AUTO_THRESHOLD:
                cn_match = best[0]
                ridx = next(r for cn, r in cohort if cn == cn_match)
                match_type = "fuzzy_in_cohort"
                match_idx = ridx
                confidence = int(best[1])
            elif best and best[1] >= SUGGEST_THRESHOLD:
                cn_match = best[0]
                ridx = next(r for cn, r in cohort if cn == cn_match)
                cohort_suggestion = (ridx, int(best[1]))

        # Tier 2b: fuzzy across all regions (catches jurisdiction reassignments like
        # Argoba moving from Amhara -> Afar). High threshold to avoid noise.
        if match_idx is None and wnorm:
            global_choices = list(exact_by_norm.keys())
            best = process.extractOne(wnorm, global_choices, scorer=fuzz.WRatio)
            if best and best[1] >= FUZZY_GLOBAL_THRESHOLD:
                # Use the first ref entry for this normalized name
                ridx = exact_by_norm[best[0]][0]
                match_type = "fuzzy_global"
                match_idx = ridx
                confidence = int(best[1])
                n_fuzzy_global += 1

        # Tier 3 (record candidates for manual review): top-3 fuzzy globally,
        # prepended by the cohort suggestion if any
        suggested_pcode = ""
        if match_idx is None:
            global_choices = list(exact_by_norm.keys())
            top = process.extract(wnorm, global_choices, scorer=fuzz.WRatio, limit=3) if wnorm else []
            cand_lines = []
            if cohort_suggestion is not None:
                ridx, score = cohort_suggestion
                r = ref.loc[ridx]
                cand_lines.append(f"[SUGGESTED] {r['woreda']}|{r['region']}/{r['zone']}|{r['ADM3_PCODE']}|score={score}")
                suggested_pcode = r["ADM3_PCODE"]
                n_suggested += 1
            for cn_match, score, _ in top:
                ridx = exact_by_norm[cn_match][0]
                r = ref.loc[ridx]
                cand_lines.append(f"{r['woreda']}|{r['region']}/{r['zone']}|{r['ADM3_PCODE']}|score={int(score)}")
            candidates_str = " ;; ".join(cand_lines)

        if match_idx is not None:
            r = ref.loc[match_idx]
            matches.append({
                "organisationunitname": wraw,
                "region_malaria": row["region"],
                "zone_malaria": row["zone"],
                "match_type": match_type,
                "confidence": confidence,
                "ADM3_PCODE": r["ADM3_PCODE"],
                "ADM3_EN_ref": r["woreda"],
                "ADM2_EN_ref": r["zone"],
                "ADM1_EN_ref": r["region"],
            })
            if match_type == "exact_in_cohort":
                n_exact_in_cohort += 1
            elif match_type == "exact_global":
                n_exact += 1
            elif match_type == "fuzzy_in_cohort":
                n_fuzzy_in_cohort += 1
        else:
            review.append({
                "organisationunitname": wraw,
                "region_malaria": row["region"],
                "zone_malaria": row["zone"],
                "normalized": wnorm,
                "top3_candidates": candidates_str,
                "ADM3_PCODE_suggested": suggested_pcode,
                "ADM3_PCODE_final": suggested_pcode,  # pre-filled when there's a suggestion
                "note": "",
            })
            n_unmatched += 1

    matches_df = pd.DataFrame(matches)
    review_df = pd.DataFrame(review)
    matches_df.to_csv(OUT_DIR / "facility_to_pcode.csv", index=False)
    review_df.to_csv(OUT_DIR / "manual_review.csv", index=False)

    total = len(mal)
    print("\n=== Resolution summary ===")
    print(f"Total unique (region,zone,woreda): {total}")
    print(f"  exact_in_cohort     : {n_exact_in_cohort:5d} ({n_exact_in_cohort/total*100:.1f}%)")
    print(f"  exact_global        : {n_exact:5d} ({n_exact/total*100:.1f}%)")
    print(f"  fuzzy_in_cohort >={AUTO_THRESHOLD}: {n_fuzzy_in_cohort:5d} ({n_fuzzy_in_cohort/total*100:.1f}%)")
    print(f"  fuzzy_global    >={FUZZY_GLOBAL_THRESHOLD}: {n_fuzzy_global:5d} ({n_fuzzy_global/total*100:.1f}%)")
    print(f"  -- review needed --")
    print(f"  pre-suggested  ({SUGGEST_THRESHOLD}-{AUTO_THRESHOLD-1}): {n_suggested:5d}   (just confirm)")
    print(f"  unmatched (top-3 candidates): {n_unmatched - n_suggested:5d}")
    print(f"  total in review     : {n_unmatched:5d} ({n_unmatched/total*100:.1f}%)")
    print(f"\nWrote: {OUT_DIR / 'facility_to_pcode.csv'}  ({len(matches_df)} rows)")
    print(f"Wrote: {OUT_DIR / 'manual_review.csv'}      ({len(review_df)} rows)")


if __name__ == "__main__":
    main()
