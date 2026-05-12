"""
Upload endpoints for malaria and climate data CSV files.
"""

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import User
from app.utils.dependencies import get_current_user, require_official
from app.schemas.upload import UploadResponse, UploadError
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


@router.post("/malaria/weekly", response_model=UploadResponse)
async def upload_weekly_malaria_data(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_official)
):
    """
    Upload weekly malaria data CSV file.
    
    **Authorization:** Officials only (not public users)
    
    **CSV Format:**
    - district_code: District code (e.g., AA-001)
    - week: Week number (1-53)
    - year: Year (2000-2100)
    - cases: Number of malaria cases (≥0)
    - deaths: Number of deaths (≥0, ≤cases)
    
    **Example CSV:**
    ```csv
    district_code,week,year,cases,deaths
    AA-001,1,2024,150,5
    OR-001,1,2024,200,8
    ```
    
    **Validation:**
    - All columns required
    - Numeric values must be valid
    - Deaths cannot exceed cases
    - District codes must exist
    - Duplicate detection (same district, week, year)
    
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
        success, message, processed, created, skipped, errors, file_id = \
            await upload_service.process_weekly_malaria_upload(content, file.filename)
        
        # Trigger background prediction processing if records were created
        if created > 0:
            # TODO: Get affected district IDs and trigger predictions
            background_tasks.add_task(trigger_prediction_processing, [], db)
        
        return UploadResponse(
            success=success,
            message=message,
            records_processed=processed,
            records_created=created,
            records_skipped=skipped,
            errors=[UploadError(**err) for err in errors],
            file_id=file_id
        )
        
    except Exception as e:
        logger.error(f"Error processing weekly malaria upload: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing upload: {str(e)}"
        )


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
    - district_code: District code (e.g., AA-001)
    - month: Month number (1-12)
    - year: Year (2000-2100)
    - cases: Number of malaria cases (≥0)
    - deaths: Number of deaths (≥0, ≤cases)
    
    **Example CSV:**
    ```csv
    district_code,month,year,cases,deaths
    AA-001,1,2024,600,20
    OR-001,1,2024,800,32
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
        success, message, processed, created, skipped, errors, file_id = \
            await upload_service.process_monthly_malaria_upload(content, file.filename)
        
        # Trigger background prediction processing if records were created
        if created > 0:
            background_tasks.add_task(trigger_prediction_processing, [], db)
        
        return UploadResponse(
            success=success,
            message=message,
            records_processed=processed,
            records_created=created,
            records_skipped=skipped,
            errors=[UploadError(**err) for err in errors],
            file_id=file_id
        )
        
    except Exception as e:
        logger.error(f"Error processing monthly malaria upload: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing upload: {str(e)}"
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
    - district_code: District code (e.g., AA-001)
    - date: Date in YYYY-MM-DD format
    - rainfall: Rainfall in mm (≥0)
    - temperature: Temperature in Celsius (-50 to 60)
    
    **Example CSV:**
    ```csv
    district_code,date,rainfall,temperature
    AA-001,2024-01-15,5.2,22.5
    OR-001,2024-01-15,12.8,24.3
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
        success, message, processed, created, skipped, errors, file_id = \
            await upload_service.process_climate_upload(content, file.filename)
        
        # Trigger background prediction processing if records were created
        if created > 0:
            background_tasks.add_task(trigger_prediction_processing, [], db)
        
        return UploadResponse(
            success=success,
            message=message,
            records_processed=processed,
            records_created=created,
            records_skipped=skipped,
            errors=[UploadError(**err) for err in errors],
            file_id=file_id
        )
        
    except Exception as e:
        logger.error(f"Error processing climate upload: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing upload: {str(e)}"
        )


@router.get("/templates/malaria/weekly")
async def download_weekly_malaria_template():
    """
    Download CSV template for weekly malaria data.
    
    **Returns:** CSV file with headers and example data
    """
    # Create CSV content
    output = StringIO()
    writer = csv.writer(output)
    
    # Write headers
    writer.writerow(['district_code', 'week', 'year', 'cases', 'deaths'])
    
    # Write example rows
    writer.writerow(['AA-001', '1', '2024', '150', '5'])
    writer.writerow(['OR-001', '1', '2024', '200', '8'])
    writer.writerow(['AM-001', '1', '2024', '180', '6'])
    
    # Convert to bytes
    output.seek(0)
    content = output.getvalue().encode('utf-8')
    
    return StreamingResponse(
        BytesIO(content),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=malaria_weekly_template.csv"}
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
    
    # Write headers
    writer.writerow(['district_code', 'month', 'year', 'cases', 'deaths'])
    
    # Write example rows
    writer.writerow(['AA-001', '1', '2024', '600', '20'])
    writer.writerow(['OR-001', '1', '2024', '800', '32'])
    writer.writerow(['AM-001', '1', '2024', '720', '24'])
    
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
    
    # Write example rows
    writer.writerow(['AA-001', '2024-01-15', '5.2', '22.5'])
    writer.writerow(['OR-001', '2024-01-15', '12.8', '24.3'])
    writer.writerow(['AM-001', '2024-01-15', '8.5', '20.1'])
    
    # Convert to bytes
    output.seek(0)
    content = output.getvalue().encode('utf-8')
    
    return StreamingResponse(
        BytesIO(content),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=climate_data_template.csv"}
    )
