"""
Upload endpoints for malaria and climate data CSV files.
"""

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import User
from app.utils.dependencies import get_current_user, require_official
from app.schemas.upload import UploadResponse, UploadError, StageResult, UploadPreviewResponse
from app.services.upload_service import UploadService
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


@router.post("/malaria/monthly", response_model=UploadResponse)
async def upload_monthly_malaria_data(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_official)
):
    """
    Upload monthly malaria data CSV file.
    
    **Authorization:** Officials only (not public users)
    
    **CSV Format:**
    - district_code: Ethiopian woreda code (e.g., ET140101 — see /uploads/templates/malaria/monthly)
    - month: Month number (1-12)
    - year: Year (2000-2100)
    - cases: Number of malaria cases (≥0)
    - deaths: Number of deaths (≥0, ≤cases)

    **Example CSV:**
    ```csv
    district_code,month,year,cases,deaths
    ET140101,1,2024,600,20
    ET040101,1,2024,800,32
    ```
    
    **Validation:**
    - All columns required
    - Numeric values must be valid
    - Deaths cannot exceed cases
    - District codes must exist
    - Duplicate detection (same district, month, year)
    
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

        # Monthly close orchestration is owned by Celery (app.tasks.monthly_close)
        # when settings.MONTHLY_CLOSE_ENABLED is true. No FastAPI background task
        # needed here — the upload service has already dispatched.

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


@router.post("/malaria/monthly/preview", response_model=UploadPreviewResponse)
async def preview_monthly_malaria_upload(
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


@router.post("/climate", response_model=UploadResponse)
async def upload_climate_data(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_official)
):
    """
    Upload climate data CSV file.
    
    **Authorization:** Officials only (not public users)
    
    **CSV Format:**
    - district_code: Ethiopian woreda code (e.g., ET140101 — see /uploads/templates/climate)
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


@router.get("/templates/malaria/monthly")
async def download_monthly_malaria_template():
    """
    Download CSV template for monthly malaria data.
    
    **Returns:** CSV file with headers and example data
    """
    # Create CSV content
    output = StringIO()
    writer = csv.writer(output)
    
    # Headers — `tests` is optional. Officers who don't report exposure data
    # can leave it blank; the predictor falls back to a cases*5 (TPR=20%) proxy.
    writer.writerow(['district_code', 'month', 'year', 'cases', 'deaths', 'tests'])

    # 4 example rows using real Ethiopian woreda codes (ETxxxxxx, CSA 2021
    # boundaries). Last row demonstrates that `tests` may be left blank.
    # Month is chosen to sit beyond the seeded history so the template
    # imports successfully out of the box; officers replace it with their
    # actual reporting month.
    writer.writerow(['ET140101', '5', '2026', '600', '20', '2400'])  # Akaki Kality, Addis Ababa
    writer.writerow(['ET040101', '5', '2026', '800', '32', '3500'])  # Mana Sibu, Oromia
    writer.writerow(['ET030101', '5', '2026', '720', '24', '3000'])  # Addi Arekay, Amhara
    writer.writerow(['ET010101', '5', '2026', '410', '11', ''])      # Tahtay Adiyabo, Tigray
    
    # Convert to bytes
    output.seek(0)
    content = output.getvalue().encode('utf-8')
    
    return StreamingResponse(
        BytesIO(content),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=malaria_monthly_template.csv"}
    )


@router.get("/templates/climate")
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
