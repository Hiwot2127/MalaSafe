"""Stage 1: parse Eth_Month_Year and add Gregorian date columns.

Input:  temp/final_processed_df_<year>EC.csv
Output: temp/climate-pipeline/processed/malaria_<year>EC_dated.csv

Added columns:
  Period_Gregorian_start  (YYYY-MM-DD, first Gregorian day of the EC month)
  Period_Gregorian_end    (YYYY-MM-DD, last Gregorian day of the EC month)
  Period                  (representative Gregorian label, "YYYY MMM" matching sample env file)
"""
from __future__ import annotations
import re
import sys
from pathlib import Path
import pandas as pd
from ethiopian_date_converter.ethiopian_date_convertor import (
    create_ethiopian_date_from_parts,
    to_gregorian,
    ethiopian_month_length,
)

# Canonical EC month order (1-indexed)
EC_MONTHS = [
    "meskerem", "tikimt", "hidar", "tahsas", "tir", "yekatit",
    "megabit", "miyazya", "ginbot", "sene", "hamle", "nehase", "pagume",
]
# Map every observed spelling -> EC month number (1..13)
EC_ALIASES: dict[str, int] = {}
for i, name in enumerate(EC_MONTHS, start=1):
    EC_ALIASES[name] = i
# Spellings observed in the malaria data + common variants
EXTRA = {
    "tikemet": 2, "tikemt": 2, "tiqimt": 2, "tikimit": 2,
    "hedar": 3, "hidaar": 3,
    "tahesas": 4, "tahasas": 4, "tahsaas": 4,
    "ter": 5,
    "yakatit": 6, "yekatitt": 6,
    "magabit": 7,
    "miazia": 8, "miyazyaa": 8, "miazya": 8,
    "genbot": 9, "ginbott": 9,
    "sane": 10,
    "hamlee": 11, "hamlie": 11,
    "nahase": 12, "nehasse": 12, "nehassae": 12,
    "pagumen": 13, "paguman": 13, "phaguman": 13, "pagumē": 13,
}
EC_ALIASES.update(EXTRA)

# "Sept" vs "Sep" to match the sample env file's Period format
GREG_MONTH_LABELS = {
    1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "May", 6: "Jun",
    7: "Jul", 8: "Aug", 9: "Sept", 10: "Oct", 11: "Nov", 12: "Dec",
}

PERIOD_RE = re.compile(r"^\s*([A-Za-zĀ-ž]+)\s+(\d{4})\s*(?:EC)?\s*$", re.IGNORECASE)


def parse_ec_period(s: str) -> tuple[int, int]:
    """Parse 'Meskerem 2016' or 'Meskerem 2016EC' -> (year, month_1_to_13)."""
    m = PERIOD_RE.match(s)
    if not m:
        raise ValueError(f"Unparseable Eth_Month_Year: {s!r}")
    name, year = m.group(1).lower(), int(m.group(2))
    if name not in EC_ALIASES:
        raise ValueError(f"Unknown EC month name {name!r} in {s!r}")
    return year, EC_ALIASES[name]


def ec_to_gregorian_window(year_ec: int, month_ec: int) -> tuple:
    """Return (start_date, end_date, representative_period_label).

    representative period = the Gregorian (year, month) that contains MORE
    days of this EC month, formatted as 'YYYY MMM' matching the sample file.
    """
    days = ethiopian_month_length(month_ec, year_ec)
    start = to_gregorian(create_ethiopian_date_from_parts(1, month_ec, year_ec))
    end = to_gregorian(create_ethiopian_date_from_parts(days, month_ec, year_ec))
    # Decide representative Gregorian month: whichever holds more days
    if start.month == end.month:
        rep_y, rep_m = start.year, start.month
    else:
        # days in start.month within the window
        # all EC months are <= 30 days; the window straddles at most one boundary
        # number of days in start's Gregorian month from start.day to end-of-month
        import calendar
        last_in_start = calendar.monthrange(start.year, start.month)[1]
        days_in_start = last_in_start - start.day + 1
        days_in_end = end.day
        if days_in_start >= days_in_end:
            rep_y, rep_m = start.year, start.month
        else:
            rep_y, rep_m = end.year, end.month
    period_label = f"{rep_y} {GREG_MONTH_LABELS[rep_m]}"
    return start.date(), end.date(), period_label


def normalize_file(in_path: Path, out_path: Path) -> dict:
    df = pd.read_csv(in_path)
    if "Eth_Month_Year" not in df.columns:
        sys.exit(f"Missing Eth_Month_Year column in {in_path}")

    # Build a tiny cache: unique period -> (start, end, label)
    unique_periods = df["Eth_Month_Year"].dropna().unique()
    cache: dict[str, tuple] = {}
    for p in unique_periods:
        y, m = parse_ec_period(p)
        cache[p] = ec_to_gregorian_window(y, m)

    df["Period_Gregorian_start"] = df["Eth_Month_Year"].map(lambda s: cache[s][0])
    df["Period_Gregorian_end"]   = df["Eth_Month_Year"].map(lambda s: cache[s][1])
    df["Period"]                 = df["Eth_Month_Year"].map(lambda s: cache[s][2])

    out_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(out_path, index=False)
    return {"rows": len(df), "unique_periods": len(unique_periods), "cache": cache}


def main() -> None:
    root = Path("/Users/danielbogale/Documents/second-brain")
    pipeline = root / "temp" / "climate-pipeline"
    # Discover every final_processed_df_<year>EC.csv
    inputs = sorted((root / "temp").glob("final_processed_df_*EC.csv"))
    if not inputs:
        sys.exit("No final_processed_df_*EC.csv files found in temp/")
    for in_p in inputs:
        ec_year = in_p.stem.split("_")[-1].replace("EC", "")
        out_p = pipeline / "processed" / f"malaria_{ec_year}EC_dated.csv"
        print(f"\n=== {ec_year}EC ===")
        info = normalize_file(in_p, out_p)
        print(f"rows: {info['rows']}, unique periods: {info['unique_periods']}")
        for p, (s, e, label) in sorted(info["cache"].items(), key=lambda kv: kv[1][0]):
            print(f"  {p:18s} -> {s} .. {e}  ({label})")
        print(f"wrote: {out_p}")


if __name__ == "__main__":
    main()
