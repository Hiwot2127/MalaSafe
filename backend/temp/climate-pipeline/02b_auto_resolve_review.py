"""Stage 2b: Auto-resolve manual_review.csv by picking the best candidate.

Rules (user-delegated "best choice"):
  - If ADM3_PCODE_suggested is filled (the 84 high-confidence 82-87 fuzzy rows):
      -> use the suggestion.
  - Else parse top3_candidates and:
      a) Prefer candidates whose region matches the malaria region (normalized).
         If best in-region score >= IN_REGION_THRESHOLD, take it.
      b) Otherwise, take the top global candidate IF its score >= GLOBAL_THRESHOLD.
      c) Otherwise leave blank -> null climate (treated as truly new/split woreda).

Writes back to manual_review.csv (in-place), populating ADM3_PCODE_final.
Prints a decision report so the user can audit.
"""
from __future__ import annotations
import re
from pathlib import Path
import pandas as pd

ROOT = Path("/Users/danielbogale/Documents/second-brain")
CW = ROOT / "temp" / "climate-pipeline" / "crosswalk" / "manual_review.csv"

IN_REGION_THRESHOLD = 70   # decent in-region match
GLOBAL_THRESHOLD = 85      # confident cross-region match (jurisdiction shift)

# High-confidence manual overrides for cases the fuzzy match can't bridge.
# Reasons: Amharic-English directional translation (Semen=North, Debub=South),
# i/e transliteration variants, or sub-unit -> parent mappings.
OVERRIDES = {
    # name, region (normalized) -> (ADM3_PCODE, reason)
    ("North Achefer Woreda",      "amhara"):              ("ET030701", "Semen Achefer (Semen=North in Amharic)"),
    ("South Achefer Woreda",      "amhara"):              ("ET030713", "Debub Achefer (Debub=South in Amharic)"),
    ("Pawi Woreda",               "benishangul gumz"):    ("ET060206", "Pawe (i/e transliteration variant)"),
    ("Bele Hawassa Town",         "southern ethiopi"):    ("ET160018", "Hawasa town (Bele is a sub-unit of Hawassa)"),
}

REGION_SUFFIXES = ["region", "city administration"]
REGION_ALIASES = {
    "gambella": "gambela",
    "benishangul gumuz": "benishangul gumz",
    "central ethiopian": "central ethiopia",
    "south ethiopia": "southern ethiopi",
    "southern ethiopia": "southern ethiopi",
}


def norm_region(s: str) -> str:
    if not isinstance(s, str):
        return ""
    s = s.lower().strip()
    for suf in REGION_SUFFIXES:
        if s.endswith(" " + suf):
            s = s[: -len(suf)].rstrip()
            break
    s = re.sub(r"\s+", " ", s).strip()
    return REGION_ALIASES.get(s, s)


# top3_candidates entries look like:
#   "[SUGGESTED] Erebti|Afar/Kilbati /Zone2|ET020201|score=83"
# or
#   "Asayita|Afar/Awsi /Zone 1|ET020103|score=80"
CAND_RE = re.compile(
    r"(?:\[SUGGESTED\]\s*)?"
    r"(?P<name>[^|]+)\|"
    r"(?P<region>[^/|]+)/(?P<zone>[^|]+)\|"
    r"(?P<pcode>ET\w+)\|score=(?P<score>\d+)"
)


def parse_candidates(s: str):
    if not isinstance(s, str) or not s.strip():
        return []
    parts = [p.strip() for p in s.split(";;")]
    out = []
    for p in parts:
        m = CAND_RE.search(p)
        if m:
            d = m.groupdict()
            d["score"] = int(d["score"])
            d["region_norm"] = norm_region(d["region"].strip())
            d["is_suggested"] = "[SUGGESTED]" in p
            out.append(d)
    return out


def main() -> None:
    df = pd.read_csv(CW, dtype=str).fillna("")
    print(f"Loaded {len(df)} review rows")

    n_kept_suggested, n_in_region, n_global, n_blank, n_override = 0, 0, 0, 0, 0
    decisions = []

    for idx, row in df.iterrows():
        # Hard override first (highest priority)
        ov_key = (row["organisationunitname"], norm_region(row["region_malaria"]))
        if ov_key in OVERRIDES:
            pcode, reason = OVERRIDES[ov_key]
            df.at[idx, "ADM3_PCODE_final"] = pcode
            df.at[idx, "note"] = f"override: {reason}"
            n_override += 1
            decisions.append((row["organisationunitname"], pcode, "override: " + reason))
            continue

        if row["ADM3_PCODE_suggested"]:
            # already pre-suggested by Stage 2 (in-cohort score 82-87) -> accept
            df.at[idx, "ADM3_PCODE_final"] = row["ADM3_PCODE_suggested"]
            df.at[idx, "note"] = "auto:suggested(82-87)"
            n_kept_suggested += 1
            decisions.append((row["organisationunitname"], row["ADM3_PCODE_suggested"], "suggested(82-87)"))
            continue

        cands = parse_candidates(row["top3_candidates"])
        if not cands:
            df.at[idx, "ADM3_PCODE_final"] = ""
            df.at[idx, "note"] = "no_candidates"
            n_blank += 1
            continue

        malaria_region = norm_region(row["region_malaria"])
        in_region = [c for c in cands if c["region_norm"] == malaria_region]

        chosen = None
        why = ""
        if in_region:
            best = max(in_region, key=lambda c: c["score"])
            if best["score"] >= IN_REGION_THRESHOLD:
                chosen = best
                why = f"in_region(score={best['score']})"
        if chosen is None:
            best_global = max(cands, key=lambda c: c["score"])
            if best_global["score"] >= GLOBAL_THRESHOLD:
                chosen = best_global
                why = f"global(score={best_global['score']})"

        if chosen:
            df.at[idx, "ADM3_PCODE_final"] = chosen["pcode"]
            df.at[idx, "note"] = f"auto:{why} -> {chosen['name'].strip()}"
            if "in_region" in why:
                n_in_region += 1
            else:
                n_global += 1
            decisions.append((row["organisationunitname"], chosen["pcode"], why + " -> " + chosen["name"].strip()))
        else:
            df.at[idx, "ADM3_PCODE_final"] = ""
            df.at[idx, "note"] = "auto:no_match_above_floor -> null climate"
            n_blank += 1
            decisions.append((row["organisationunitname"], "", "no_match"))

    df.to_csv(CW, index=False)

    print(f"\n=== Auto-resolution summary ===")
    print(f"  hard overrides:            {n_override}")
    print(f"  kept suggested (82-87):    {n_kept_suggested}")
    print(f"  picked in-region (>={IN_REGION_THRESHOLD}):    {n_in_region}")
    print(f"  picked global (>={GLOBAL_THRESHOLD}):       {n_global}")
    print(f"  left blank (null climate): {n_blank}")
    print(f"  total:                     {n_override + n_kept_suggested + n_in_region + n_global + n_blank}")

    # Dump the blanks for visibility
    blanks = df[df["ADM3_PCODE_final"] == ""]
    print(f"\n=== Left blank ({len(blanks)}) — these get null climate ===")
    for _, r in blanks.head(30).iterrows():
        print(f"  {r['organisationunitname']:40s} (region={r['region_malaria']})")
    if len(blanks) > 30:
        print(f"  ... and {len(blanks) - 30} more")


if __name__ == "__main__":
    main()
