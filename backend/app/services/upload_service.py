"""
Service for handling CSV uploads and data processing.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.models import MalariaData, ClimateData, UploadedFile, District
from app.utils.csv_parser import MalariaCSVParser, ClimateCSVParser
from app.utils.district_mapper import DistrictMapper
from app.utils.season_generator import SeasonGenerator
from typing import Tuple, List, Dict
import pandas as pd
import uuid
from datetime import datetime
from loguru import logger


class UploadService:
    """Service for processing CSV uploads."""
    
    def __init__(self, db: AsyncSession, user_id: str):
        """
        Initialize upload service.
        
        Args:
            db: Database session
            user_id: ID of user performing upload
        """
        self.db = db
        self.user_id = user_id
        self.district_mapper = DistrictMapper(db)
    
    async def process_weekly_malaria_upload(
        self, 
        file_content: bytes, 
        filename: str
    ) -> Tuple[bool, str, int, int, int, List[Dict], str]:
        """
        Process weekly malaria data upload.
        
        Args:
            file_content: Raw file bytes
            filename: Original filename
            
        Returns:
            Tuple of (success, message, processed, created, skipped, errors, file_id)
        """
        # Parse CSV
        df, parse_errors = MalariaCSVParser.parse_weekly_data(file_content)
        
        if df is None or parse_errors:
            return False, "CSV validation failed", 0, 0, 0, parse_errors, None
        
        # Load districts
        await self.district_mapper.load_districts()
        
        # Validate district codes and collect data
        records_to_create = []
        validation_errors = []
        skipped_count = 0
        
        for idx, row in df.iterrows():
            row_num = idx + 2
            district_code = str(row['district_code']).strip()
            
            # Validate district
            is_valid, district_id, error_msg = await self.district_mapper.validate_district_code(district_code)
            
            if not is_valid:
                validation_errors.append({
                    "row": row_num,
                    "column": "district_code",
                    "value": district_code,
                    "error": error_msg
                })
                skipped_count += 1
                continue
            
            # Check for duplicates
            week = int(row['week'])
            year = int(row['year'])
            
            existing = await self.db.execute(
                select(MalariaData).where(
                    and_(
                        MalariaData.district_id == district_id,
                        MalariaData.week == week,
                        MalariaData.year == year
                    )
                )
            )
            
            if existing.scalar_one_or_none():
                validation_errors.append({
                    "row": row_num,
                    "column": "duplicate",
                    "value": f"{district_code}, Week {week}, {year}",
                    "error": "Duplicate record already exists"
                })
                skipped_count += 1
                continue
            
            # Prepare record
            records_to_create.append({
                "district_id": district_id,
                "source_type": "file_upload",
                "week": week,
                "month": None,  # Weekly data doesn't have month
                "year": year,
                "cases": int(row['cases']),
                "deaths": int(row['deaths']),
                "uploaded_by": self.user_id
            })
        
        # Save records
        created_count = 0
        if records_to_create:
            for record_data in records_to_create:
                record = MalariaData(**record_data)
                self.db.add(record)
                created_count += 1
            
            await self.db.commit()
        
        # Save file metadata
        file_id = await self._save_file_metadata(filename, "malaria_weekly")
        
        success = len(validation_errors) == 0
        message = f"Successfully uploaded {created_count} records" if success else f"Uploaded {created_count} records with {len(validation_errors)} errors"
        
        return success, message, len(df), created_count, skipped_count, validation_errors, str(file_id)
    
    async def process_monthly_malaria_upload(
        self, 
        file_content: bytes, 
        filename: str
    ) -> Tuple[bool, str, int, int, int, List[Dict], str]:
        """
        Process monthly malaria data upload.
        
        Args:
            file_content: Raw file bytes
            filename: Original filename
            
        Returns:
            Tuple of (success, message, processed, created, skipped, errors, file_id)
        """
        # Parse CSV
        df, parse_errors = MalariaCSVParser.parse_monthly_data(file_content)
        
        if df is None or parse_errors:
            return False, "CSV validation failed", 0, 0, 0, parse_errors, None
        
        # Load districts
        await self.district_mapper.load_districts()
        
        # Validate district codes and collect data
        records_to_create = []
        validation_errors = []
        skipped_count = 0
        
        for idx, row in df.iterrows():
            row_num = idx + 2
            district_code = str(row['district_code']).strip()
            
            # Validate district
            is_valid, district_id, error_msg = await self.district_mapper.validate_district_code(district_code)
            
            if not is_valid:
                validation_errors.append({
                    "row": row_num,
                    "column": "district_code",
                    "value": district_code,
                    "error": error_msg
                })
                skipped_count += 1
                continue
            
            # Check for duplicates
            month = int(row['month'])
            year = int(row['year'])
            
            existing = await self.db.execute(
                select(MalariaData).where(
                    and_(
                        MalariaData.district_id == district_id,
                        MalariaData.month == month,
                        MalariaData.year == year,
                        MalariaData.week.is_(None)  # Monthly records have no week
                    )
                )
            )
            
            if existing.scalar_one_or_none():
                validation_errors.append({
                    "row": row_num,
                    "column": "duplicate",
                    "value": f"{district_code}, {month}/{year}",
                    "error": "Duplicate record already exists"
                })
                skipped_count += 1
                continue
            
            # Prepare record
            records_to_create.append({
                "district_id": district_id,
                "source_type": "file_upload",
                "week": None,
                "month": month,
                "year": year,
                "cases": int(row['cases']),
                "deaths": int(row['deaths']),
                "uploaded_by": self.user_id
            })
        
        # Save records
        created_count = 0
        if records_to_create:
            for record_data in records_to_create:
                record = MalariaData(**record_data)
                self.db.add(record)
                created_count += 1
            
            await self.db.commit()
        
        # Save file metadata
        file_id = await self._save_file_metadata(filename, "malaria_monthly")
        
        success = len(validation_errors) == 0
        message = f"Successfully uploaded {created_count} records" if success else f"Uploaded {created_count} records with {len(validation_errors)} errors"
        
        return success, message, len(df), created_count, skipped_count, validation_errors, str(file_id)
    
    async def process_climate_upload(
        self, 
        file_content: bytes, 
        filename: str
    ) -> Tuple[bool, str, int, int, int, List[Dict], str]:
        """
        Process climate data upload.
        
        Args:
            file_content: Raw file bytes
            filename: Original filename
            
        Returns:
            Tuple of (success, message, processed, created, skipped, errors, file_id)
        """
        # Parse CSV
        df, parse_errors = ClimateCSVParser.parse_climate_data(file_content)
        
        if df is None or parse_errors:
            return False, "CSV validation failed", 0, 0, 0, parse_errors, None
        
        # Load districts
        await self.district_mapper.load_districts()
        
        # Validate district codes and collect data
        records_to_create = []
        validation_errors = []
        skipped_count = 0
        
        for idx, row in df.iterrows():
            row_num = idx + 2
            district_code = str(row['district_code']).strip()
            
            # Validate district
            is_valid, district_id, error_msg = await self.district_mapper.validate_district_code(district_code)
            
            if not is_valid:
                validation_errors.append({
                    "row": row_num,
                    "column": "district_code",
                    "value": district_code,
                    "error": error_msg
                })
                skipped_count += 1
                continue
            
            # Parse date
            try:
                date_value = pd.to_datetime(row['date']).date()
            except Exception as e:
                validation_errors.append({
                    "row": row_num,
                    "column": "date",
                    "value": str(row['date']),
                    "error": f"Invalid date format: {str(e)}"
                })
                skipped_count += 1
                continue
            
            # Generate season
            season = SeasonGenerator.get_season_from_date(date_value)
            
            # Check for duplicates
            existing = await self.db.execute(
                select(ClimateData).where(
                    and_(
                        ClimateData.district_id == district_id,
                        ClimateData.date == date_value
                    )
                )
            )
            
            if existing.scalar_one_or_none():
                validation_errors.append({
                    "row": row_num,
                    "column": "duplicate",
                    "value": f"{district_code}, {date_value}",
                    "error": "Duplicate record already exists"
                })
                skipped_count += 1
                continue
            
            # Prepare record
            records_to_create.append({
                "district_id": district_id,
                "rainfall": float(row['rainfall']),
                "temperature": float(row['temperature']),
                "season": season,
                "date": date_value
            })
        
        # Save records
        created_count = 0
        if records_to_create:
            for record_data in records_to_create:
                record = ClimateData(**record_data)
                self.db.add(record)
                created_count += 1
            
            await self.db.commit()
        
        # Save file metadata
        file_id = await self._save_file_metadata(filename, "climate_data")
        
        success = len(validation_errors) == 0
        message = f"Successfully uploaded {created_count} records" if success else f"Uploaded {created_count} records with {len(validation_errors)} errors"
        
        return success, message, len(df), created_count, skipped_count, validation_errors, str(file_id)
    
    async def _save_file_metadata(self, filename: str, upload_type: str) -> uuid.UUID:
        """
        Save uploaded file metadata.
        
        Args:
            filename: Original filename
            upload_type: Type of upload
            
        Returns:
            File ID
        """
        file_record = UploadedFile(
            file_name=filename,
            upload_type=upload_type,
            uploaded_by=self.user_id
        )
        
        self.db.add(file_record)
        await self.db.commit()
        await self.db.refresh(file_record)
        
        logger.info(f"Saved file metadata: {filename} ({upload_type}) by user {self.user_id}")
        
        return file_record.id
