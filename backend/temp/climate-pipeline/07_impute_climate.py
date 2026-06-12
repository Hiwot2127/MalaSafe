"""Stage 7: Impute missing climate values via hierarchical fallback.

For each row missing climate values, fill using the mean of resolved+complete
rows in the same group, in this priority order:
  1. (Region, Zone, Eth_Month_Year)  -- closest spatial+temporal context
  2. (Region,       Eth_Month_Year)  -- broader region+month
  3. (              Eth_Month_Year)  -- country-wide month
  4. (Region,       )                -- region-wide (any month, last resort)

Adds a column `climate_source` per row:
  'direct'     = observed climate (CHIRPS / ERA5-Land / SRTM)
  'imp_z_m'    = imputed from region+zone+month mean
  'imp_r_m'    = imputed from region+month mean
  'imp_m'      = imputed from country-wide month mean
  'imp_r'      = imputed from region mean

Rewrites each outputs/final_processed_df_*EC_with_climate.csv in place.
"""
from __future__ import annotations
from pathlib import Path
import glob
import numpy as np
import pandas as pd

ROOT = Path("/Users/danielbogale/Documents/second-brain/temp/climate-pipeline/outputs")
CLIMATE_COLS = ["Latitude", "Longitude", "Elevation_m",
                "MaxTemp_C", "MinTemp_C", "AvgTemp_C", "Rainfall_mm", "Humidity_pct"]


def main() -> None:
    files = sorted(ROOT.glob("final_processed_df_*EC_with_climate.csv"))
    print(f"Loading {len(files)} year files ...")
    all_df = pd.concat([pd.read_csv(f).assign(_src_file=f.name) for f in files], ignore_index=True)
    n_total = len(all_df)
    print(f"  total rows: {n_total}")

    # Pool of OBSERVED (direct) rows that we use to compute group means.
    obs = all_df[all_df["ADM3_PCODE"].notna() & all_df["MaxTemp_C"].notna()].copy()
    print(f"  direct (observed): {len(obs)} ({len(obs)/n_total*100:.1f}%)")

    # Pre-compute group means at each granularity (for ALL climate cols)
    print("  building group means ...")
    g_zm  = obs.groupby(["Region", "Zone", "Eth_Month_Year"], dropna=False)[CLIMATE_COLS].mean()
    g_rm  = obs.groupby(["Region", "Eth_Month_Year"], dropna=False)[CLIMATE_COLS].mean()
    g_m   = obs.groupby(["Eth_Month_Year"], dropna=False)[CLIMATE_COLS].mean()
    g_r   = obs.groupby(["Region"], dropna=False)[CLIMATE_COLS].mean()

    # Initialize the source label
    all_df["climate_source"] = np.where(all_df["MaxTemp_C"].notna(), "direct", "")

    def fill_from(df_idx, group, group_keys, src_tag):
        """Fill rows at df_idx by matching group_keys -> group (a DataFrame indexed by those keys)."""
        nonlocal all_df
        target = all_df.loc[df_idx]
        # For each climate column, fill missing using the group mean
        # Build a per-row lookup
        if len(group_keys) == 1:
            key = target[group_keys[0]]
            lookup = group.reindex(key.values).reset_index(drop=True)
            lookup.index = target.index
        else:
            key = list(zip(*[target[c] for c in group_keys]))
            try:
                lookup = group.reindex(key).reset_index(drop=True)
                lookup.index = target.index
            except Exception:
                lookup = pd.DataFrame(index=target.index, columns=CLIMATE_COLS, dtype=float)
        filled_any = pd.Series(False, index=target.index)
        for col in CLIMATE_COLS:
            mask = target[col].isna() & lookup[col].notna()
            all_df.loc[mask[mask].index, col] = lookup.loc[mask, col]
            filled_any |= mask
        # Mark source for rows whose label is still empty AND at least one col was filled here
        empty_label = (all_df.loc[df_idx, "climate_source"] == "")
        all_df.loc[filled_any[filled_any].index.intersection(empty_label[empty_label].index), "climate_source"] = src_tag

    # Tier 1: region + zone + month
    idx_need = all_df.index[all_df["MaxTemp_C"].isna() | all_df["Rainfall_mm"].isna() | all_df["Elevation_m"].isna()]
    print(f"  rows needing imputation: {len(idx_need)}")
    fill_from(idx_need, g_zm, ["Region", "Zone", "Eth_Month_Year"], "imp_z_m")

    # Tier 2: region + month
    idx_need = all_df.index[all_df["MaxTemp_C"].isna() | all_df["Rainfall_mm"].isna() | all_df["Elevation_m"].isna()]
    fill_from(idx_need, g_rm, ["Region", "Eth_Month_Year"], "imp_r_m")

    # Tier 3: month
    idx_need = all_df.index[all_df["MaxTemp_C"].isna() | all_df["Rainfall_mm"].isna() | all_df["Elevation_m"].isna()]
    fill_from(idx_need, g_m, ["Eth_Month_Year"], "imp_m")

    # Tier 4: region (last resort, very few cases)
    idx_need = all_df.index[all_df["MaxTemp_C"].isna() | all_df["Rainfall_mm"].isna() | all_df["Elevation_m"].isna()]
    fill_from(idx_need, g_r, ["Region"], "imp_r")

    # Recompute AvgTemp_C if Min/Max are filled but Avg is not (consistency)
    avg_mask = all_df["AvgTemp_C"].isna() & all_df["MaxTemp_C"].notna() & all_df["MinTemp_C"].notna()
    all_df.loc[avg_mask, "AvgTemp_C"] = (all_df.loc[avg_mask, "MaxTemp_C"] + all_df.loc[avg_mask, "MinTemp_C"]) / 2.0

    # Round
    for c in ["MaxTemp_C", "MinTemp_C", "AvgTemp_C", "Humidity_pct", "Elevation_m"]:
        all_df[c] = all_df[c].round(2)
    all_df["Rainfall_mm"] = all_df["Rainfall_mm"].round(3)
    for c in ["Latitude", "Longitude"]:
        all_df[c] = all_df[c].round(4)

    # Report
    print("\n=== Imputation summary ===")
    print(all_df["climate_source"].value_counts().to_string())
    still_null = all_df[CLIMATE_COLS].isna().any(axis=1).sum()
    print(f"\nRows with any remaining climate null: {still_null}")

    # Write back per-year
    print("\nRewriting per-year files ...")
    for f in files:
        sub = all_df[all_df["_src_file"] == f.name].drop(columns=["_src_file"]).copy()
        sub.to_csv(f, index=False)
        complete = sub[CLIMATE_COLS].notna().all(axis=1).sum()
        direct = (sub["climate_source"] == "direct").sum()
        print(f"  {f.name}: {len(sub)} rows | complete {complete} ({complete/len(sub)*100:.1f}%) | direct {direct} ({direct/len(sub)*100:.1f}%)")


if __name__ == "__main__":
    main()
