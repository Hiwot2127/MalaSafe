"""Why is cohort matching failing?"""
import pandas as pd
from pathlib import Path

ROOT = Path("/Users/danielbogale/Documents/second-brain")
ref = pd.read_csv(ROOT / "temp" / "reference-geo-name" / "reference_geo_names.csv")
mal = pd.read_csv(ROOT / "temp" / "final_processed_df_2016EC.csv",
                  usecols=["orgunitlevel2", "orgunitlevel3"])
mal = mal.drop_duplicates()
mal.columns = ["region", "zone"]

ref_regions = set(ref["region"].str.lower().str.strip().unique())
mal_regions = set(mal["region"].str.lower().str.strip().unique())

print("=== Regions ===")
print(f"  ref n={len(ref_regions)}, malaria n={len(mal_regions)}")
print(f"  in both ({len(ref_regions & mal_regions)}): {sorted(ref_regions & mal_regions)}")
print(f"  ref only ({len(ref_regions - mal_regions)}): {sorted(ref_regions - mal_regions)}")
print(f"  malaria only ({len(mal_regions - ref_regions)}): {sorted(mal_regions - ref_regions)}")

ref_zones = set(ref["zone"].str.lower().str.strip().unique())
mal_zones = set(mal["zone"].str.lower().str.strip().unique())
print(f"\n=== Zones ===")
print(f"  ref n={len(ref_zones)}, malaria n={len(mal_zones)}")
print(f"  in both ({len(ref_zones & mal_zones)})")
print(f"  ref only sample (5/{len(ref_zones - mal_zones)}): {sorted(ref_zones - mal_zones)[:5]}")
print(f"  malaria only sample (5/{len(mal_zones - ref_zones)}): {sorted(mal_zones - ref_zones)[:5]}")
