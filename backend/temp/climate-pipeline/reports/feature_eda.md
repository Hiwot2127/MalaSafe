# Feature Engineering EDA

Rows: **60,940**  |  Columns: **88**

## Split sizes

| split   |   count |
|:--------|--------:|
| train   |   46536 |
| val     |    6648 |
| test    |    7756 |


## Target (Positive) per split

| split   |   count |    mean |   median |   zero_frac |   max |
|:--------|--------:|--------:|---------:|------------:|------:|
| test    |    7756 | 339.46  |     71   |   0.0947653 | 18371 |
| train   |   46536 | 320.752 |     38   |   0.164238  | 50200 |
| val     |    6648 | 497.038 |    122.5 |   0.0926594 | 19207 |


## Missingness (top 20 features)

|                      |   missing_frac |
|:---------------------|---------------:|
| ADM3_PCODE           |      0.0595668 |
| rainfall_anomaly     |      0.0595668 |
| baseline_avgtemp     |      0.0595668 |
| baseline_rainfall    |      0.0595668 |
| temp_anomaly         |      0.0595668 |
| MaxTemp_C_lag3       |      0.0545455 |
| Rainfall_mm_lag3     |      0.0545455 |
| positivity_rate_lag3 |      0.0545455 |
| AvgTemp_C_lag3       |      0.0545455 |
| MinTemp_C_lag3       |      0.0545455 |
| Humidity_pct_lag3    |      0.0545455 |
| positive_lag3        |      0.0545455 |
| tests_lag3           |      0.0545455 |
| MinTemp_C_lag2       |      0.0363636 |
| Humidity_pct_lag2    |      0.0363636 |
| AvgTemp_C_lag2       |      0.0363636 |
| positive_lag2        |      0.0363636 |
| Rainfall_mm_lag2     |      0.0363636 |
| tests_lag2           |      0.0363636 |
| MaxTemp_C_lag2       |      0.0363636 |


## Top correlations with log_positive (train rows, |r| desc, no leakage)

|                        |   |pearson_r| |
|:-----------------------|--------------:|
| positivity_rate_lag1   |      0.60263  |
| positivity_rate_lag2   |      0.557131 |
| tests_lag1             |      0.549719 |
| tests_lag2             |      0.526321 |
| positivity_rate_lag3   |      0.522783 |
| tests_lag3             |      0.510815 |
| positive_lag1          |      0.489295 |
| positive_lag2          |      0.459646 |
| positive_lag3          |      0.438103 |
| Longitude              |      0.432033 |
| Rainfall_mm_roll3_sum  |      0.309948 |
| Rainfall_mm_roll6_mean |      0.281642 |
| region_Tigray Region   |      0.281203 |
| month_index            |      0.280168 |
| Rainfall_mm_roll3_mean |      0.276726 |


## climate_source mix per split

| split   |   csrc_direct |   csrc_imp_r_m |   csrc_imp_z_m |
|:--------|--------------:|---------------:|---------------:|
| test    |          0.94 |          0.003 |          0.057 |
| train   |          0.94 |          0.003 |          0.057 |
| val     |          0.94 |          0.003 |          0.057 |