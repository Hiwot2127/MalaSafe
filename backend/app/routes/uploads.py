"""
Upload endpoints for malaria and climate data CSV files.
"""

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, BackgroundTasks, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import User, Alert, District
from app.utils.dependencies import get_current_user, require_official
from app.schemas.upload import UploadResponse, UploadError, StageResult, UploadPreviewResponse
from app.schemas.upload_eda import UploadEDAResponse, HistoricalComparison, StatsSummary
from app.services.upload_service import UploadService
from app.middleware.rate_limit import limiter
from app.cache.decorators import invalidate_cache
from app.utils.upload_eda import (
    calculate_statistics,
    create_distribution,
    detect_outliers,
    check_completeness,
    detect_data_quality_issues,
    _jsonable,
)
from io import StringIO, BytesIO
import csv
import pandas as pd
from loguru import logger
from sqlalchemy import select, func
from datetime import datetime
from dateutil.relativedelta import relativedelta

router = APIRouter(prefix="/uploads", tags=["Uploads"])


# Background task for AI prediction processing
async def trigger_prediction_processing(district_ids: list[str], db: AsyncSession):
    """
    Background task to trigger AI prediction processing.
    
    Args:
        district_ids: List of district IDs to process
        db: Database session
    """
    logger.info(f"Triggering prediction processing for {len(district_ids)} districts")
    # TODO: Implement AI prediction logic
    # This will be implemented when building the AI/ML module
    pass


@router.post(
    "/malaria/monthly",
    response_model=UploadResponse,
    summary="Upload monthly malaria cases CSV",
    responses={400: {"description": "Bad file or validation error"}, 403: {"description": "Public users cannot upload"}},
)
@limiter.limit("10/hour")  # Rate limit: 10 uploads per hour
async def upload_monthly_malaria_data(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_official)
):
    """
    Upload monthly malaria data CSV file (DHIS2 org-unit or district-code keyed).

    **Authorization:** Officials only (not public users)

    **CSV Format:**
    - organisationunitid: DHIS2 organisation unit ID (e.g., `JgBKioqJo5h`) OR
    - district_code: Ethiopian woreda code (e.g., `ET120101`)
    - Eth_Month_Year: Ethiopian month + year label (e.g., `Ginbot 2016`)
    - Positive: Number of positive cases (>=0)
    - Tests: Number of tests performed (>=0)
    - Travel: Number of travel-related cases (>=0, optional, defaults to 0)

    **Example CSV:**
    ```csv
    organisationunitid,Eth_Month_Year,Travel,Positive,Tests
    JgBKioqJo5h,Ginbot 2016,17,89,823
    JgBKioqJo5h,Sene 2016,5,42,510
    ```
    or
    ```csv
    district_code,Eth_Month_Year,Travel,Positive,Tests
    ET120101,Tahsas 2018,11,64,598
    ET120102,Tahsas 2018,9,57,552
    ```

    **Validation:**
    - Required columns: Eth_Month_Year, Positive, Tests, plus one identifier
      column (`organisationunitid` or `district_code`)
    - Numeric values must be valid (Positive/Tests/Travel >= 0)
    - Eth_Month_Year must be a valid Ethiopian month + EC year
    - identifier must exist in the districts catalog
    - Duplicate detection (same identifier, month, year — facility rows
      are aggregated to the woreda level before duplicate check)

    **Returns:**
    - Success status
    - Number of records processed/created/skipped
    - Validation errors (if any)
    - File ID for tracking
    """
    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are allowed"
        )
    
    # Read file content
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error reading file: {str(e)}"
        )
    
    # Process upload
    upload_service = UploadService(db, str(current_user.id))
    
    try:
        (success, message, processed, created, skipped, errors, file_id,
         monthly_close_id, monthly_close_mode, stages) = \
            await upload_service.process_monthly_malaria_upload(content, file.filename)

        # Monthly close orchestration runs in-process via asyncio.create_task()
        # from upload_service when settings.MONTHLY_CLOSE_ENABLED is true.

        return UploadResponse(
            success=success,
            message=message,
            records_processed=processed,
            records_created=created,
            records_skipped=skipped,
            errors=[UploadError(**err) for err in errors],
            file_id=file_id,
            monthly_close_id=monthly_close_id,
            monthly_close_mode=monthly_close_mode,
            stages=[StageResult(**s) for s in stages],
        )

    except Exception as e:
        logger.error(f"Error processing monthly malaria upload: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing upload: {str(e)}"
        )
    finally:
        # Invalidate analytics caches after upload (success or failure)
        try:
            await invalidate_cache("analytics:*")
            await invalidate_cache("maps:*")
            logger.info("Analytics and maps caches invalidated after upload")
        except Exception as cache_error:
            logger.warning(f"Failed to invalidate cache: {cache_error}")


@router.post(
    "/malaria/monthly/preview",
    response_model=UploadPreviewResponse,
    summary="Validate a malaria CSV (dry-run, no write)",
    responses={400: {"description": "Bad file or validation error"}},
)
@limiter.limit("20/hour")  # Rate limit: 20 previews per hour (more lenient than actual uploads)
async def preview_monthly_malaria_upload(
    request: Request,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_official),
):
    """
    Dry-run a monthly malaria upload. Same parsing + per-row validation as the
    real endpoint, but **no rows are written** to the database.

    Powers the pre-upload modal: the frontend can show valid / invalid /
    duplicate counts (and per-row reasons) before the user commits to the
    real upload at `POST /uploads/malaria/monthly`.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are allowed",
        )
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error reading file: {str(e)}",
        )

    upload_service = UploadService(db, str(current_user.id))
    try:
        return await upload_service.dry_run_validate_monthly(content, file.filename)
    except Exception as e:
        logger.error(f"Error previewing monthly malaria upload: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error previewing upload: {str(e)}",
        )


@router.post(
    "/malaria/monthly/preview-eda",
    response_model=UploadEDAResponse,
    summary="Validate malaria CSV with EDA insights (dry-run)",
    responses={400: {"description": "Bad file or validation error"}},
)
@limiter.limit("20/hour")
async def preview_monthly_malaria_with_eda(
    request: Request,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_official),
):
    """
    Enhanced preview with Exploratory Data Analysis (EDA) insights.
    
    Same as regular preview but includes:
    - Summary statistics (mean, median, std dev, etc.)
    - Distribution data for charts
    - Outlier detection (Z-score based)
    - Data completeness analysis
    - Historical comparison with previous uploads
    
    **This is a dry-run** - no data is written to the database.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are allowed",
        )
    
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error reading file: {str(e)}",
        )
    
    # Get regular preview data
    upload_service = UploadService(db, str(current_user.id))
    try:
        preview_data = await upload_service.dry_run_validate_monthly(content, file.filename)
    except Exception as e:
        logger.error(f"Error previewing malaria upload: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error previewing upload: {str(e)}",
        )
    
    # Parse CSV for EDA analysis
    try:
        from io import BytesIO
        df = pd.read_csv(BytesIO(content))
        
        # Filter to valid rows only for statistics
        if preview_data.summary.valid_rows > 0:
            # For now, use all rows - in production, filter based on validation
            valid_df = df.copy()
        else:
            # No valid rows, return minimal EDA
            return UploadEDAResponse(
                summary=preview_data.summary.dict(),
                sample_valid=preview_data.sample_valid,
                invalid=preview_data.invalid,
                duplicates=preview_data.duplicates,
                stats=None,
                distributions=[],
                outliers=[],
                completeness=[],
                historical_comparison=HistoricalComparison(
                    current_total_cases=0,
                    status="no_data",
                    message="No valid rows to analyze"
                )
            )
        
        # Calculate statistics
        stats = calculate_statistics(valid_df)
        stats.valid_rows = preview_data.summary.valid_rows
        stats.invalid_rows = preview_data.summary.invalid_rows
        
        # Get all districts from DB to find missing ones
        all_districts_result = await db.execute(
            select(District.district_code)
        )
        all_district_codes = {str(d) for d in all_districts_result.scalars().all()}
        upload_district_codes = set(stats.districts_list)
        missing = sorted(list(all_district_codes - upload_district_codes))
        stats.missing_districts = missing[:10]  # First 10 missing
        
        # Create distributions
        distributions = [
            create_distribution(valid_df, 'Positive', bins=10),
            create_distribution(valid_df, 'Tests', bins=10),
        ]
        
        # Detect outliers (statistical + data quality issues)
        statistical_outliers = detect_outliers(valid_df, ['Positive', 'Tests'], z_threshold=3.0)
        quality_issues = detect_data_quality_issues(valid_df)
        all_outliers = statistical_outliers + quality_issues
        all_outliers = all_outliers[:15]  # Limit to 15 total
        
        # Check completeness
        completeness = check_completeness(valid_df, {
            'district_code': None,
            'Eth_Month_Year': None,
            'Positive': None,
            'Tests': None,
            'Travel': 0  # Defaults to 0 if missing
        })
        
        # Historical comparison - get most recent month's data
        try:
            # Get the most recent malaria data from last month
            from app.models import MalariaData
            one_month_ago = datetime.now() - relativedelta(months=1)
            
            previous_result = await db.execute(
                select(func.sum(MalariaData.positive))
                .where(MalariaData.date >= one_month_ago)
            )
            previous_total = previous_result.scalar()
            
            current_total = stats.total_positive
            
            if previous_total and previous_total > 0:
                change_abs = current_total - int(previous_total)
                change_pct = (change_abs / previous_total) * 100
                
                # Determine status
                if abs(change_pct) < 10:
                    status_str = "within_range"
                    message = f"Within 10% of previous month ({change_pct:+.1f}%)"
                elif change_pct > 0:
                    status_str = "above_average"
                    message = f"{change_pct:+.1f}% increase from previous month"
                else:
                    status_str = "below_average"
                    message = f"{change_pct:.1f}% decrease from previous month"
                
                historical = HistoricalComparison(
                    current_total_cases=current_total,
                    previous_total_cases=int(previous_total),
                    change_absolute=change_abs,
                    change_percent=change_pct,
                    comparison_period="Last month",
                    status=status_str,
                    message=message
                )
            else:
                historical = HistoricalComparison(
                    current_total_cases=current_total,
                    status="no_comparison",
                    message="No historical data available for comparison"
                )
        except Exception as e:
            logger.warning(f"Could not fetch historical data: {e}")
            historical = HistoricalComparison(
                current_total_cases=stats.total_positive,
                status="no_comparison",
                message="Historical comparison unavailable"
            )
        
        return UploadEDAResponse(
            summary=preview_data.summary.dict(),
            sample_valid=preview_data.sample_valid,
            invalid=preview_data.invalid,
            duplicates=preview_data.duplicates,
            stats=stats,
            distributions=distributions,
            outliers=all_outliers,
            completeness=completeness,
            historical_comparison=historical
        )
        
    except Exception as e:
        logger.error(f"Error performing EDA on upload: {e}")
        # Fall back to regular preview if EDA fails
        return UploadEDAResponse(
            summary=preview_data.summary.dict(),
            sample_valid=preview_data.sample_valid,
            invalid=preview_data.invalid,
            duplicates=preview_data.duplicates,
            stats=None,
            distributions=[],
            outliers=[],
            completeness=[],
            historical_comparison=HistoricalComparison(
                current_total_cases=0,
                status="error",
                message=f"EDA analysis failed: {str(e)}"
            )
        )


@router.post(
    "/climate",
    response_model=UploadResponse,
    summary="Upload climate data CSV (rainfall, temperature, etc.)",
    responses={400: {"description": "Bad file or validation error"}, 403: {"description": "Public users cannot upload"}},
)
@limiter.limit("10/hour")  # Rate limit: 10 uploads per hour
async def upload_climate_data(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_official)
):
    """
    Upload climate data CSV file.
    
    **Authorization:** Officials only (not public users)
    
    **CSV Format:**
    - district_code: Ethiopian woreda code (e.g., ET140101 - see /uploads/templates/climate)
    - date: Date in YYYY-MM-DD format
    - rainfall: Rainfall in mm (≥0)
    - temperature: Temperature in Celsius (-50 to 60)

    **Example CSV:**
    ```csv
    district_code,date,rainfall,temperature
    ET140101,2024-01-15,5.2,22.5
    ET040101,2024-01-15,12.8,24.3
    ```
    
    **Validation:**
    - All columns required
    - Date must be valid YYYY-MM-DD format
    - Rainfall must be ≥ 0
    - Temperature must be between -50 and 60
    - District codes must exist
    - Duplicate detection (same district, date)
    - Season automatically generated from date
    
    **Returns:**
    - Success status
    - Number of records processed/created/skipped
    - Validation errors (if any)
    - File ID for tracking
    """
    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are allowed"
        )
    
    # Read file content
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error reading file: {str(e)}"
        )
    
    # Process upload
    upload_service = UploadService(db, str(current_user.id))
    
    try:
        (success, message, processed, created, skipped, errors, file_id,
         monthly_close_id, monthly_close_mode, stages) = \
            await upload_service.process_climate_upload(content, file.filename)

        return UploadResponse(
            success=success,
            message=message,
            records_processed=processed,
            records_created=created,
            records_skipped=skipped,
            errors=[UploadError(**err) for err in errors],
            file_id=file_id,
            monthly_close_id=monthly_close_id,
            monthly_close_mode=monthly_close_mode,
            stages=[StageResult(**s) for s in stages],
        )

    except Exception as e:
        logger.error(f"Error processing climate upload: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing upload: {str(e)}"
        )
    finally:
        # Invalidate analytics caches after climate upload
        try:
            await invalidate_cache("analytics:*")
            await invalidate_cache("maps:*")
            logger.info("Analytics and maps caches invalidated after climate upload")
        except Exception as cache_error:
            logger.warning(f"Failed to invalidate cache: {cache_error}")


@router.post(
    "/climate/preview",
    response_model=UploadEDAResponse,
    summary="Validate climate CSV with EDA insights (dry-run)",
    responses={400: {"description": "Bad file or validation error"}},
)
@limiter.limit("20/hour")
async def preview_climate_upload(
    request: Request,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_official),
):
    """
    Preview climate upload with Exploratory Data Analysis (EDA) insights.
    
    **This is a dry-run** - no data is written to the database.
    
    Returns:
    - Validation results (valid/invalid rows)
    - Summary statistics (rainfall, temperature)
    - Distribution data for visualization
    - Outlier detection
    - Data completeness analysis
    - Historical comparison
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are allowed",
        )
    
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error reading file: {str(e)}",
        )
    
    # Parse CSV for validation and EDA
    try:
        from io import BytesIO
        df = pd.read_csv(BytesIO(content))
        
        # Basic validation
        required_columns = ['district_code', 'date', 'rainfall', 'temperature']
        missing_cols = [col for col in required_columns if col not in df.columns]
        
        if missing_cols:
            return UploadEDAResponse(
                summary={'total_rows': len(df), 'valid_rows': 0, 'skipped_rows': len(df), 'duplicate_rows': 0, 'distinct_months': [], 'predicted_mode': None},
                sample_valid=[],
                invalid=[UploadError(error=f"Missing required columns: {', '.join(missing_cols)}")],
                duplicates=[],
                stats=None,
                distributions=[],
                outliers=[],
                completeness=[],
                historical_comparison=HistoricalComparison(
                    current_total_cases=0,
                    status="error",
                    message="File has missing columns"
                )
            )
        
        # Validate data types and ranges
        errors = []
        valid_rows = []
        
        for idx, row in df.iterrows():
            row_errors = []
            
            # Validate district code
            if pd.isna(row['district_code']):
                row_errors.append("district_code is missing")
            
            # Validate date
            try:
                pd.to_datetime(row['date'])
            except:
                row_errors.append(f"Invalid date format: {row['date']}")
            
            # Validate rainfall
            try:
                rainfall = float(row['rainfall'])
                if rainfall < 0:
                    row_errors.append(f"Rainfall must be >= 0, got {rainfall}")
            except:
                row_errors.append(f"Invalid rainfall value: {row['rainfall']}")
            
            # Validate temperature
            try:
                temp = float(row['temperature'])
                if temp < -50 or temp > 60:
                    row_errors.append(f"Temperature must be between -50 and 60, got {temp}")
            except:
                row_errors.append(f"Invalid temperature value: {row['temperature']}")
            
            if row_errors:
                errors.append(UploadError(
                    row=int(idx) + 2,  # +2 for header and 0-indexing
                    error="; ".join(row_errors),
                    row_data={k: _jsonable(v) for k, v in row.to_dict().items()}
                ))
            else:
                valid_rows.append({
                    'row_number': int(idx) + 2,
                    'data': {k: _jsonable(v) for k, v in row.to_dict().items()}
                })
        
        valid_count = len(valid_rows)
        invalid_count = len(errors)
        
        # Create summary
        summary = {
            'total_rows': len(df),
            'valid_rows': valid_count,
            'skipped_rows': invalid_count,
            'duplicate_rows': 0,  # TODO: Check duplicates
            'distinct_months': [],
            'predicted_mode': None
        }
        
        # If we have valid rows, calculate EDA
        if valid_count > 0:
            valid_df = df[~df.index.isin([e.row - 2 for e in errors])]
            
            # Calculate statistics for climate data
            rainfall_data = pd.to_numeric(valid_df['rainfall'], errors='coerce')
            temp_data = pd.to_numeric(valid_df['temperature'], errors='coerce')
            
            stats = StatsSummary(
                total_rows=len(valid_df),
                valid_rows=valid_count,
                invalid_rows=invalid_count,
                unique_periods=0,
                unique_districts=valid_df['district_code'].nunique(),
                districts_list=sorted(valid_df['district_code'].unique().tolist()),
                missing_districts=[],
                # Use rainfall/temperature instead of malaria-specific fields
                total_positive=0,  # Not applicable
                avg_positive=float(rainfall_data.mean()) if not rainfall_data.empty else 0,
                median_positive=float(rainfall_data.median()) if not rainfall_data.empty else 0,
                min_positive=0,
                max_positive=0,
                std_positive=float(rainfall_data.std()) if not rainfall_data.empty else 0,
                total_tests=0,  # Not applicable
                avg_tests=float(temp_data.mean()) if not temp_data.empty else 0,
                median_tests=float(temp_data.median()) if not temp_data.empty else 0,
                test_positivity_rate=0,  # Not applicable
            )
            
            # Get all districts from DB
            all_districts_result = await db.execute(select(District.district_code))
            all_district_codes = {str(d) for d in all_districts_result.scalars().all()}
            upload_district_codes = set(stats.districts_list)
            missing = sorted(list(all_district_codes - upload_district_codes))
            stats.missing_districts = missing[:10]
            
            # Create distributions for climate data
            distributions = [
                create_distribution(valid_df, 'rainfall', bins=10),
                create_distribution(valid_df, 'temperature', bins=10),
            ]
            
            # Detect outliers
            outliers = detect_outliers(valid_df, ['rainfall', 'temperature'], z_threshold=3.0)
            
            # Check completeness
            completeness = check_completeness(valid_df, {
                'district_code': None,
                'date': None,
                'rainfall': None,
                'temperature': None,
            })
            
            # Historical comparison - get recent climate data
            try:
                from app.models import ClimateData
                one_month_ago = datetime.now() - relativedelta(months=1)
                
                # Get average rainfall from last month
                previous_result = await db.execute(
                    select(func.avg(ClimateData.rainfall))
                    .where(ClimateData.date >= one_month_ago)
                )
                previous_avg_rainfall = previous_result.scalar()
                
                current_avg_rainfall = float(rainfall_data.mean())
                
                if previous_avg_rainfall and previous_avg_rainfall > 0:
                    change_abs = current_avg_rainfall - float(previous_avg_rainfall)
                    change_pct = (change_abs / previous_avg_rainfall) * 100
                    
                    if abs(change_pct) < 10:
                        status_str = "within_range"
                        message = f"Rainfall within 10% of previous month ({change_pct:+.1f}%)"
                    elif change_pct > 0:
                        status_str = "above_average"
                        message = f"Rainfall {change_pct:+.1f}% above previous month"
                    else:
                        status_str = "below_average"
                        message = f"Rainfall {change_pct:.1f}% below previous month"
                    
                    historical = HistoricalComparison(
                        current_total_cases=int(rainfall_data.sum()),
                        previous_total_cases=int(previous_avg_rainfall * len(valid_df)),
                        change_absolute=int(change_abs * len(valid_df)),
                        change_percent=change_pct,
                        comparison_period="Last month",
                        status=status_str,
                        message=message
                    )
                else:
                    historical = HistoricalComparison(
                        current_total_cases=int(rainfall_data.sum()),
                        status="no_comparison",
                        message="No historical climate data available"
                    )
            except Exception as e:
                logger.warning(f"Could not fetch historical climate data: {e}")
                historical = HistoricalComparison(
                    current_total_cases=int(rainfall_data.sum()) if not rainfall_data.empty else 0,
                    status="no_comparison",
                    message="Historical comparison unavailable"
                )
            
            return UploadEDAResponse(
                summary=summary,
                sample_valid=valid_rows[:50],
                invalid=errors,
                duplicates=[],
                stats=stats,
                distributions=distributions,
                outliers=outliers,
                completeness=completeness,
                historical_comparison=historical
            )
        else:
            # No valid rows
            return UploadEDAResponse(
                summary=summary,
                sample_valid=[],
                invalid=errors,
                duplicates=[],
                stats=None,
                distributions=[],
                outliers=[],
                completeness=[],
                historical_comparison=HistoricalComparison(
                    current_total_cases=0,
                    status="no_data",
                    message="No valid rows to analyze"
                )
            )
            
    except Exception as e:
        logger.error(f"Error previewing climate upload: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error previewing upload: {str(e)}",
        )


@router.get(
    "/templates/malaria/monthly",
    summary="Download blank malaria monthly CSV template",
    response_class=StreamingResponse,
)
async def download_monthly_malaria_template():
    """
    Download CSV template for monthly malaria data.
    
    **Returns:** CSV file with headers and example data
    """
    # Create CSV content
    output = StringIO()
    writer = csv.writer(output)

    # Headers — `Travel` is optional (defaults to 0 if blank). Required:
    # organisationunitid, Eth_Month_Year, Positive, Tests.
    writer.writerow(['organisationunitid', 'Eth_Month_Year', 'Travel', 'Positive', 'Tests'])

    # Example rows use a real DHIS2 org unit ID drawn from the seed CSV
    # (`JgBKioqJo5h`) with realistic EC month labels. Officers replace these
    # with their actual reporting month and facility IDs.
    writer.writerow(['JgBKioqJo5h', 'Ginbot 2016', '17', '89', '823'])
    writer.writerow(['JgBKioqJo5h', 'Sene 2016', '5', '42', '510'])
    writer.writerow(['JgBKioqJo5h', 'Hamle 2016', '', '12', '310'])  # Travel left blank -> 0

    # Convert to bytes
    output.seek(0)
    content = output.getvalue().encode('utf-8')

    return StreamingResponse(
        BytesIO(content),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=malaria_monthly_template.csv"}
    )


@router.get(
    "/templates/climate",
    summary="Download blank climate CSV template",
    response_class=StreamingResponse,
)
async def download_climate_template():
    """
    Download CSV template for climate data.
    
    **Returns:** CSV file with headers and example data
    """
    # Create CSV content
    output = StringIO()
    writer = csv.writer(output)
    
    # Write headers
    writer.writerow(['district_code', 'date', 'rainfall', 'temperature'])

    # Example rows using real Ethiopian woreda codes (ETxxxxxx, CSA 2021).
    # Date is chosen beyond the seeded climate history so the template
    # imports cleanly; officers replace it with their actual observation date.
    writer.writerow(['ET140101', '2026-05-15', '5.2', '22.5'])  # Akaki Kality, Addis Ababa
    writer.writerow(['ET040101', '2026-05-15', '12.8', '24.3'])  # Mana Sibu, Oromia
    writer.writerow(['ET030101', '2026-05-15', '8.5', '20.1'])   # Addi Arekay, Amhara
    
    # Convert to bytes
    output.seek(0)
    content = output.getvalue().encode('utf-8')
    
    return StreamingResponse(
        BytesIO(content),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=climate_data_template.csv"}
    )
