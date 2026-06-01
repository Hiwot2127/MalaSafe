"""Maps feature names + SHAP direction to human-readable reason phrases.

Used by the predictor to compose `prediction_reason` strings like
"high cumulative rainfall over past 3 months; warm temperatures 2 months ago;
elevated cases last month".

Each entry is keyed by feature name. The value is a tuple:
    (positive_shap_phrase, negative_shap_phrase)
"positive" = feature pushed the prediction UP (toward higher cases).
"negative" = feature pushed the prediction DOWN.
"""

PHRASEBOOK: dict[str, tuple[str, str]] = {
    # --- Rainfall (current + lags + rolling) ---
    "Rainfall_mm":            ("high rainfall this month",
                               "unusually dry month"),
    "Rainfall_mm_lag1":       ("heavy rain last month",
                               "dry conditions last month"),
    "Rainfall_mm_lag2":       ("heavy rain 2 months ago",
                               "dry 2 months ago"),
    "Rainfall_mm_lag3":       ("heavy rain 3 months ago",
                               "dry 3 months ago"),
    "Rainfall_mm_roll3_mean": ("wet 3-month period",
                               "dry 3-month period"),
    "Rainfall_mm_roll3_sum":  ("high cumulative rainfall over past 3 months",
                               "low cumulative rainfall over past 3 months"),
    "Rainfall_mm_roll6_mean": ("wet half-year",
                               "dry half-year"),
    "rainfall_anomaly":       ("rainfall above seasonal norm",
                               "rainfall below seasonal norm"),

    # --- Temperature (avg/max/min + lags + rolling) ---
    "AvgTemp_C":          ("warm month",                "cool month"),
    "AvgTemp_C_lag1":     ("warm last month",            "cool last month"),
    "AvgTemp_C_lag2":     ("warm temperatures 2 months ago",
                           "cool temperatures 2 months ago"),
    "AvgTemp_C_lag3":     ("warm temperatures 3 months ago",
                           "cool temperatures 3 months ago"),
    "AvgTemp_C_roll3_mean": ("warm 3-month average",   "cool 3-month average"),
    "AvgTemp_C_roll6_mean": ("warm half-year",          "cool half-year"),
    "MaxTemp_C":          ("hot daytime conditions",   "mild daytime conditions"),
    "MaxTemp_C_lag1":     ("hot daytime last month",    "mild daytime last month"),
    "MaxTemp_C_lag2":     ("hot daytime 2 months ago", "mild daytime 2 months ago"),
    "MinTemp_C":          ("warm nights",              "cold nights"),
    "MinTemp_C_lag1":     ("warm nights last month",    "cold nights last month"),
    "temp_anomaly":       ("temperature above seasonal norm",
                           "temperature below seasonal norm"),

    # --- Humidity ---
    "Humidity_pct":          ("humid month",            "dry-air month"),
    "Humidity_pct_lag1":     ("humid last month",        "low humidity last month"),
    "Humidity_pct_lag2":     ("humid 2 months ago",     "low humidity 2 months ago"),
    "Humidity_pct_roll3_mean": ("sustained humidity",    "sustained low humidity"),

    # --- Geography / elevation ---
    "Elevation_m":   ("low-altitude facility",      "high-altitude facility"),
    "is_highland":   ("highland zone",              "lowland zone"),
    "Latitude":      ("northerly location",         "southerly location"),
    "Longitude":     ("eastern Ethiopia",           "western Ethiopia"),

    # --- Autoregressive (case history) ---
    "positive_lag1": ("elevated cases last month",  "few cases last month"),
    "positive_lag2": ("elevated cases 2 months ago", "few cases 2 months ago"),
    "positive_lag3": ("elevated cases 3 months ago", "few cases 3 months ago"),
    "tests_lag1":    ("high testing volume last month", "low testing volume last month"),
    "tests_lag2":    ("high testing volume 2 months ago", "low testing volume 2 months ago"),
    "positivity_rate_lag1": ("high positivity last month", "low positivity last month"),
    "positivity_rate_lag2": ("high positivity 2 months ago", "low positivity 2 months ago"),
    "positivity_rate_lag3": ("high positivity 3 months ago", "low positivity 3 months ago"),

    # --- Travel / population pressure ---
    "Travel":        ("high inbound travel",        "low inbound travel"),

    # --- Temporal / seasonality ---
    "g_month":       ("late-year month",            "early-year month"),
    "g_month_sin":   ("mid-rains seasonal phase",   "off-rains seasonal phase"),
    "g_month_cos":   ("late-rains seasonal phase",  "dry-season phase"),
    "ec_month":      ("late EC month",              "early EC month"),
    "month_index":   ("recent time period",         "earlier time period"),

    # --- Baselines (rarely top, but possible) ---
    "baseline_rainfall": ("typically wet location for this month",
                          "typically dry location for this month"),
    "baseline_avgtemp":  ("typically warm location for this month",
                          "typically cool location for this month"),

    # --- Categorical (one-hot regions, climate source) ---
    # Region one-hots: phrasing handled dynamically in code via the column name suffix.
    # Climate-source one-hots: rarely informative for direction; omit.
}


def phrase_for(feature: str, shap_value: float) -> str | None:
    """Return a phrase for a SHAP contribution, or None if unmapped."""
    if feature.startswith("region_"):
        region = feature.removeprefix("region_").replace(" Region", "")
        if shap_value > 0:
            return f"located in {region}"
        return None  # negative region one-hot isn't informative
    if feature.startswith("csrc_"):
        return None  # climate-source flags aren't user-facing
    pair = PHRASEBOOK.get(feature)
    if pair is None:
        return None
    return pair[0] if shap_value > 0 else pair[1]
