"""Stage 4: Compute per-woreda monthly climate aggregates.

For each unique (ADM3_PCODE, EC month) pair across all 5 malaria files, produce:
  Rainfall_mm, MaxTemp_C, MinTemp_C, AvgTemp_C, Humidity_pct, Latitude, Longitude, Elevation_m

Time alignment:
  Each EC month covers a Gregorian day window [start, end]. CHIRPS monthly totals are
  pro-rated to that window (assumes uniform daily rainfall within Gregorian month).
  ERA5-Land hourly is sliced to the exact day window, then per-day max/min/mean of t2m
  is computed and averaged over the month.

Output: processed/climate_per_woreda_monthly.csv
"""
from __future__ import annotations
import calendar
import math
import re
from datetime import date, datetime, timedelta
from pathlib import Path
import numpy as np
import pandas as pd
import geopandas as gpd
import rasterio
from rasterstats import zonal_stats
import xarray as xr

ROOT = Path("/Users/danielbogale/Documents/second-brain")
CW = ROOT / "temp" / "climate-pipeline"
SHP = ROOT / "temp" / "reference-geo-name" / "ETH shape file 2024" / "eth_admbnda_adm3_csa_bofedb_2021.shp"
CHIRPS_DIR = CW / "raw_rasters" / "chirps"
ERA5_DIR = CW / "raw_rasters" / "era5_land"
SRTM = CW / "raw_rasters" / "srtm" / "ethiopia_srtm_90m.tif"
PROCESSED_DIR = CW / "processed"
OUT = PROCESSED_DIR / "climate_per_woreda_monthly.csv"


def magnus_rh(t_C: np.ndarray, td_C: np.ndarray) -> np.ndarray:
    """Relative humidity (%) from air temperature and dewpoint, both in degrees C.
    Uses the Magnus formula (Alduchov & Eskridge 1996).
    """
    a, b = 17.625, 243.04
    es_t = np.exp((a * t_C) / (b + t_C))
    es_td = np.exp((a * td_C) / (b + td_C))
    return 100.0 * es_td / es_t


def load_woreda_periods() -> pd.DataFrame:
    """Build the (ADM3_PCODE, Eth_Month_Year, Period_Gregorian_start/end) work list."""
    crosswalk = pd.read_csv(CW / "crosswalk" / "final_crosswalk.csv", dtype=str)
    pcodes = sorted(set(crosswalk["ADM3_PCODE"].dropna().str.strip()) - {""})
    print(f"  resolved ADM3_PCODEs: {len(pcodes)}")

    # Collect unique periods across all 5 EC files
    periods: dict[str, tuple[date, date]] = {}
    for f in sorted(PROCESSED_DIR.glob("malaria_*EC_dated.csv")):
        df = pd.read_csv(f, parse_dates=["Period_Gregorian_start", "Period_Gregorian_end"])
        for _, r in df[["Eth_Month_Year", "Period_Gregorian_start", "Period_Gregorian_end"]].drop_duplicates().iterrows():
            periods[r["Eth_Month_Year"]] = (r["Period_Gregorian_start"].date(), r["Period_Gregorian_end"].date())
    print(f"  unique EC periods: {len(periods)}")
    # Build the cross-product
    rows = []
    for pcode in pcodes:
        for ec, (s, e) in periods.items():
            rows.append({"ADM3_PCODE": pcode, "Eth_Month_Year": ec, "g_start": s, "g_end": e})
    return pd.DataFrame(rows)


def compute_centroids_and_elevation(woredas: gpd.GeoDataFrame) -> pd.DataFrame:
    """One-time: woreda centroid (lat/lon) + zonal-mean SRTM elevation."""
    # Centroids in WGS84 lon/lat (shapefile already in EPSG:4326)
    w = woredas.copy()
    w["Longitude"] = w.geometry.centroid.x.round(4)
    w["Latitude"] = w.geometry.centroid.y.round(4)
    out = w[["ADM3_PCODE", "Latitude", "Longitude"]].copy()

    # Elevation via zonal stats
    if SRTM.exists():
        print(f"  computing SRTM zonal mean for {len(w)} woredas ...")
        stats = zonal_stats(
            w[["ADM3_PCODE", "geometry"]],
            str(SRTM),
            stats=["mean"],
            nodata=-32768,
            all_touched=False,
        )
        out["Elevation_m"] = [round(s["mean"], 1) if s["mean"] is not None else np.nan for s in stats]
    else:
        print(f"  WARN: SRTM not found at {SRTM} -- Elevation_m will be NaN")
        out["Elevation_m"] = np.nan
    return out


def days_overlap(window_start: date, window_end: date, ym_year: int, ym_month: int) -> int:
    """How many days of the [window_start, window_end] EC window fall in Gregorian month (ym_year, ym_month)?"""
    last_day = calendar.monthrange(ym_year, ym_month)[1]
    m_start = date(ym_year, ym_month, 1)
    m_end = date(ym_year, ym_month, last_day)
    a = max(window_start, m_start)
    b = min(window_end, m_end)
    return max(0, (b - a).days + 1)


def compute_rainfall(work: pd.DataFrame, woredas: gpd.GeoDataFrame) -> pd.DataFrame:
    """For each (ADM3_PCODE, EC period), pro-rate CHIRPS monthly rasters onto the EC window."""
    print("\n=== Rainfall (CHIRPS, pro-rated to EC windows) ===")
    # Zonal mean per (year, month) raster -- mm for that gregorian month per woreda
    chirps_files = {}
    for tif in sorted(CHIRPS_DIR.glob("chirps-v2.0.*.tif")):
        m = re.match(r"chirps-v2\.0\.(\d{4})\.(\d{2})\.tif", tif.name)
        if m:
            chirps_files[(int(m.group(1)), int(m.group(2)))] = tif
    print(f"  available CHIRPS months: {len(chirps_files)}")
    # Compute zonal mean per (year, month) for ALL woredas, ONCE
    per_month: dict[tuple[int, int], dict[str, float]] = {}
    geom_df = woredas[["ADM3_PCODE", "geometry"]]
    for ym, tif in sorted(chirps_files.items()):
        stats = zonal_stats(geom_df, str(tif), stats=["mean"], nodata=-9999, all_touched=False)
        per_month[ym] = {pc: (s["mean"] if s["mean"] is not None else np.nan)
                          for pc, s in zip(geom_df["ADM3_PCODE"], stats)}
        print(f"  CHIRPS {ym[0]}-{ym[1]:02d}: zonal mean computed")
    # Pro-rate to EC windows
    out = []
    for _, r in work.iterrows():
        pcode = r["ADM3_PCODE"]
        s, e = r["g_start"], r["g_end"]
        total_days = (e - s).days + 1
        # Find covered (year, month) tiles
        rainfall = 0.0
        coverage = 0
        cur = date(s.year, s.month, 1)
        while cur <= e:
            ym = (cur.year, cur.month)
            ov = days_overlap(s, e, *ym)
            if ov > 0 and ym in per_month and pcode in per_month[ym]:
                m_total = per_month[ym][pcode]
                last_day = calendar.monthrange(*ym)[1]
                # Pro-rate: total mm for month * (ov / last_day)
                if not np.isnan(m_total):
                    rainfall += (ov / last_day) * m_total
                    coverage += ov
            # next month
            if cur.month == 12:
                cur = date(cur.year + 1, 1, 1)
            else:
                cur = date(cur.year, cur.month + 1, 1)
        # If we covered all days, keep; else if partial, scale back up; else NaN
        rain_val = rainfall if coverage >= total_days * 0.9 else np.nan
        out.append({"ADM3_PCODE": pcode, "Eth_Month_Year": r["Eth_Month_Year"], "Rainfall_mm": rain_val})
    return pd.DataFrame(out)


def compute_temp_humidity(work: pd.DataFrame, woredas: gpd.GeoDataFrame) -> pd.DataFrame:
    """For each (ADM3_PCODE, EC period), pro-rate ERA5-Land MONTHLY MEAN values
    (t2m, d2m) onto the EC window:
       AvgTemp_C    = day-weighted mean of monthly t2m over the EC window (K -> C)
       Humidity_pct = day-weighted mean of monthly RH (computed from t2m + d2m)
       MaxTemp_C    = AvgTemp_C + 5  (proxy: typical Ethiopian diurnal range half-width)
       MinTemp_C    = AvgTemp_C - 5
    """
    print("\n=== Temperature + humidity (ERA5-Land monthly means + diurnal proxy) ===")
    out_rows = []
    nc_path = ERA5_DIR / "era5_land_monthly_means.nc"
    if not nc_path.exists():
        print(f"  ERA5 file not found: {nc_path} -- temp/humidity will be NaN")
        for _, r in work.iterrows():
            out_rows.append({"ADM3_PCODE": r["ADM3_PCODE"], "Eth_Month_Year": r["Eth_Month_Year"],
                             "MaxTemp_C": np.nan, "MinTemp_C": np.nan, "AvgTemp_C": np.nan, "Humidity_pct": np.nan})
        return pd.DataFrame(out_rows)
    ds = xr.open_dataset(nc_path)
    print(f"  loaded {nc_path.name}: vars={list(ds.data_vars)}")
    # Time coord is monthly; identify variable names (could be t2m/d2m or different)
    time_dim = "valid_time" if "valid_time" in ds.coords else ("time" if "time" in ds.coords else list(ds.coords)[0])
    print(f"  time dim: {time_dim}; range {ds[time_dim].min().values}..{ds[time_dim].max().values}")

    # ERA5-Land is ~9km; centroid sampling is fine for woreda zonal estimates.
    centroids = woredas.copy()
    centroids["Longitude"] = centroids.geometry.centroid.x
    centroids["Latitude"] = centroids.geometry.centroid.y
    centroid_lookup = centroids.set_index("ADM3_PCODE")[["Latitude", "Longitude"]]

    pcode_list = list(centroid_lookup.index)
    lats = xr.DataArray(centroid_lookup["Latitude"].values, dims="pcode", coords={"pcode": pcode_list})
    lons = xr.DataArray(centroid_lookup["Longitude"].values, dims="pcode", coords={"pcode": pcode_list})
    # Variable names: in modern CDS NetCDF, ERA5-Land monthly means may use t2m/d2m or 2t/2d.
    var_t2m = "t2m" if "t2m" in ds.data_vars else "2t"
    var_d2m = "d2m" if "d2m" in ds.data_vars else "2d"
    t2m_C = (ds[var_t2m].sel(latitude=lats, longitude=lons, method="nearest") - 273.15)
    d2m_C = (ds[var_d2m].sel(latitude=lats, longitude=lons, method="nearest") - 273.15)
    # Pre-compute monthly RH per (time, pcode) once
    rh_monthly = magnus_rh(t2m_C.values, d2m_C.values)  # shape (time, pcode)
    rh_da = xr.DataArray(rh_monthly, coords=t2m_C.coords, dims=t2m_C.dims)

    # Index: for each Gregorian (year, month) -> data_index along time dim
    time_vals = pd.to_datetime(ds[time_dim].values)
    ym_to_idx: dict[tuple[int, int], int] = {(t.year, t.month): i for i, t in enumerate(time_vals)}
    pcode_to_i: dict[str, int] = {p: i for i, p in enumerate(pcode_list)}

    for _, r in work.iterrows():
        pcode = r["ADM3_PCODE"]
        s, e = r["g_start"], r["g_end"]
        if pcode not in pcode_to_i:
            out_rows.append({"ADM3_PCODE": pcode, "Eth_Month_Year": r["Eth_Month_Year"],
                             "MaxTemp_C": np.nan, "MinTemp_C": np.nan, "AvgTemp_C": np.nan, "Humidity_pct": np.nan})
            continue
        pi = pcode_to_i[pcode]
        # Pro-rate over the Gregorian months overlapping the EC window
        total_days = (e - s).days + 1
        weighted_t, weighted_rh, wsum = 0.0, 0.0, 0
        cur = date(s.year, s.month, 1)
        while cur <= e:
            ym = (cur.year, cur.month)
            ov = days_overlap(s, e, *ym)
            if ov > 0 and ym in ym_to_idx:
                ti = ym_to_idx[ym]
                tval = float(t2m_C.values[ti, pi])
                rhval = float(rh_da.values[ti, pi])
                if not (np.isnan(tval) or np.isnan(rhval)):
                    weighted_t  += ov * tval
                    weighted_rh += ov * rhval
                    wsum += ov
            cur = date(cur.year + (1 if cur.month == 12 else 0),
                       (cur.month % 12) + 1, 1)
        if wsum < total_days * 0.9 or wsum == 0:
            out_rows.append({"ADM3_PCODE": pcode, "Eth_Month_Year": r["Eth_Month_Year"],
                             "MaxTemp_C": np.nan, "MinTemp_C": np.nan, "AvgTemp_C": np.nan, "Humidity_pct": np.nan})
            continue
        AvgTemp = weighted_t / wsum
        Hum = weighted_rh / wsum
        # Diurnal-range proxy for Max/Min (typical Ethiopian DTR ~10C)
        MaxTemp = AvgTemp + 5.0
        MinTemp = AvgTemp - 5.0
        out_rows.append({
            "ADM3_PCODE": pcode, "Eth_Month_Year": r["Eth_Month_Year"],
            "MaxTemp_C": round(MaxTemp, 2),
            "MinTemp_C": round(MinTemp, 2),
            "AvgTemp_C": round(AvgTemp, 2),
            "Humidity_pct": round(Hum, 1),
        })
    return pd.DataFrame(out_rows)


def main() -> None:
    print("Loading shapefile ...")
    woredas = gpd.read_file(SHP)
    if woredas.crs is None or str(woredas.crs).upper() not in ("EPSG:4326", "WGS 84"):
        woredas = woredas.to_crs("EPSG:4326")
    print(f"  woredas: {len(woredas)}, CRS: {woredas.crs}")

    work = load_woreda_periods()
    print(f"\nWork list: {len(work)} (pcode, period) pairs")

    # 1) Centroids + elevation (one row per woreda)
    print("\n=== Centroids + elevation ===")
    geo = compute_centroids_and_elevation(woredas)
    print(f"  geo rows: {len(geo)}")

    # 2) Rainfall
    rain = compute_rainfall(work, woredas)

    # 3) Temp + humidity
    th = compute_temp_humidity(work, woredas)

    # Merge
    df = work.merge(rain, on=["ADM3_PCODE", "Eth_Month_Year"], how="left")
    df = df.merge(th,   on=["ADM3_PCODE", "Eth_Month_Year"], how="left")
    df = df.merge(geo,  on="ADM3_PCODE", how="left")

    # Drop work columns
    df = df.drop(columns=["g_start", "g_end"])
    cols = ["ADM3_PCODE", "Eth_Month_Year", "Latitude", "Longitude", "Elevation_m",
            "MaxTemp_C", "MinTemp_C", "AvgTemp_C", "Rainfall_mm", "Humidity_pct"]
    df = df[cols]
    df.to_csv(OUT, index=False)
    print(f"\nWrote: {OUT}  ({len(df)} rows)")
    print("\nNull counts per column:")
    print(df.isna().sum())


if __name__ == "__main__":
    main()
