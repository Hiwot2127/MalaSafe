"""Per-woreda aggregation of raster climate data.

Ports `04_zonal_stats.py` for online use:

  * ``aggregate_chirps`` — mean monthly rainfall (mm) per woreda from one
    CHIRPS GeoTIFF.
  * ``aggregate_era5`` — per-woreda monthly mean temperature (°C), min/max
    proxies (AvgTemp ± 5°C, the offline pipeline's diurnal-range proxy),
    and Magnus-formula relative humidity (%) from one ERA5-Land NetCDF.

Uses ``rasterstats`` + ``fiona`` so we don't depend on the GDAL CLI.
"""
from __future__ import annotations

from pathlib import Path

import fiona
import numpy as np
import xarray as xr
from loguru import logger
from rasterstats import zonal_stats
from shapely.geometry import shape

from .era5_client import humidity_from_dewpoint


def aggregate_chirps(tif_path: Path, shapefile_path: Path) -> dict[str, float]:
    """Mean rainfall in mm per woreda.

    Returns a dict ``{ADM3_PCODE: rainfall_mm | None}``. Woredas with no
    raster coverage (e.g. centroid outside CHIRPS extent) have value ``None``.
    """
    features = _load_features(shapefile_path)
    stats = zonal_stats(
        features,
        str(tif_path),
        stats=["mean"],
        nodata=-9999,
        all_touched=False,
        geojson_out=False,
    )
    out: dict[str, float] = {}
    for feat, s in zip(features, stats):
        pcode = feat["properties"].get("ADM3_PCODE")
        if not pcode:
            continue
        mean = s.get("mean")
        out[pcode] = round(float(mean), 3) if mean is not None and not np.isnan(mean) else None
    logger.info(f"CHIRPS zonal: {sum(1 for v in out.values() if v is not None)}/{len(out)} woredas covered")
    return out


def aggregate_era5(
    netcdf_path: Path,
    shapefile_path: Path,
    target_year: int,
    target_month: int,
) -> dict[str, dict[str, float]]:
    """Per-woreda temperature + humidity from one ERA5-Land monthly-means NetCDF.

    ERA5-Land is ~9 km; centroid sampling is sufficient for woreda-level
    aggregates (matches the offline pipeline). The offline pipeline derives
    Min/Max from the monthly mean ± 5°C, the typical Ethiopian DTR
    half-width — preserved here for feature parity with the trained model.

    Returns ``{ADM3_PCODE: {temperature, min_temp, max_temp, humidity}}``.
    Missing values are emitted as ``None``.
    """
    ds = xr.open_dataset(netcdf_path)
    time_dim = "valid_time" if "valid_time" in ds.coords else ("time" if "time" in ds.coords else list(ds.coords)[0])
    var_t2m = "t2m" if "t2m" in ds.data_vars else "2t"
    var_d2m = "d2m" if "d2m" in ds.data_vars else "2d"

    # Pick the slice for (year, month). Single-month requests yield exactly
    # one timestep, but be defensive for multi-month NetCDFs reused as cache.
    import pandas as pd  # lazy: only needed inside this function

    times = pd.to_datetime(ds[time_dim].values)
    idx_matches = [i for i, t in enumerate(times) if t.year == target_year and t.month == target_month]
    if not idx_matches:
        raise ValueError(
            f"ERA5 NetCDF {netcdf_path.name} has no timestep for {target_year}-{target_month:02d}"
        )
    ti = idx_matches[0]

    features = _load_features(shapefile_path)
    centroids = []
    for feat in features:
        geom = shape(feat["geometry"])
        c = geom.centroid
        centroids.append((feat["properties"].get("ADM3_PCODE"), c.y, c.x))

    pcodes = [c[0] for c in centroids]
    lats = xr.DataArray([c[1] for c in centroids], dims="pcode", coords={"pcode": pcodes})
    lons = xr.DataArray([c[2] for c in centroids], dims="pcode", coords={"pcode": pcodes})

    t2m_c_arr = (ds[var_t2m].isel({time_dim: ti}).sel(latitude=lats, longitude=lons, method="nearest") - 273.15).values
    d2m_c_arr = (ds[var_d2m].isel({time_dim: ti}).sel(latitude=lats, longitude=lons, method="nearest") - 273.15).values
    rh_arr = humidity_from_dewpoint(t2m_c_arr, d2m_c_arr)

    out: dict[str, dict[str, float]] = {}
    n_ok = 0
    for pcode, t2m_c, rh in zip(pcodes, t2m_c_arr, rh_arr):
        if pcode is None:
            continue
        if np.isnan(t2m_c) or np.isnan(rh):
            out[pcode] = {"temperature": None, "min_temp": None, "max_temp": None, "humidity": None}
            continue
        avg = float(t2m_c)
        out[pcode] = {
            "temperature": round(avg, 2),
            "min_temp": round(avg - 5.0, 2),
            "max_temp": round(avg + 5.0, 2),
            "humidity": round(float(rh), 1),
        }
        n_ok += 1

    ds.close()
    logger.info(f"ERA5 zonal: {n_ok}/{len(out)} woredas covered")
    return out


def _load_features(shapefile_path: Path) -> list[dict]:
    """Read the woreda shapefile as a list of GeoJSON Feature dicts.

    rasterstats requires the dicts to have a ``"type": "Feature"`` envelope —
    fiona records don't expose that at the top level, so we materialize it.
    """
    with fiona.open(str(shapefile_path)) as src:
        return [
            {
                "type": "Feature",
                "geometry": dict(f["geometry"]),
                "properties": dict(f["properties"]),
            }
            for f in src
        ]
