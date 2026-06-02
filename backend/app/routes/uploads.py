"""
Upload endpoints for malaria and climate data CSV files.
"""

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, BackgroundTasks, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import User
from app.utils.dependencies import get_current_user, require_official
from app.schemas.upload import UploadResponse, UploadError, StageResult, UploadPreviewResponse
from app.services.upload_service import UploadService
from app.middleware.rate_limit import limiter
from app.cache.decorators import invalidate_cache
from io import StringIO, BytesIO
import csv
from loguru import logger

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
