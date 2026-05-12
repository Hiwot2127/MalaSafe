"""
District mapping utilities for standardizing district codes and names.
"""

from typing import Optional, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import District
from loguru import logger


class DistrictMapper:
    """Utility for mapping and validating district codes."""
    
    def __init__(self, db: AsyncSession):
        """
        Initialize district mapper.
        
        Args:
            db: Database session
        """
        self.db = db
        self._district_cache: Dict[str, District] = {}
    
    async def load_districts(self):
        """Load all districts into cache."""
        result = await self.db.execute(select(District))
        districts = result.scalars().all()
        
        for district in districts:
            self._district_cache[district.district_code.upper()] = district
        
        logger.info(f"Loaded {len(self._district_cache)} districts into cache")
    
    async def get_district_by_code(self, district_code: str) -> Optional[District]:
        """
        Get district by code.
        
        Args:
            district_code: District code to lookup
            
        Returns:
            District object or None if not found
        """
        # Normalize code
        code = district_code.strip().upper()
        
        # Check cache first
        if code in self._district_cache:
            return self._district_cache[code]
        
        # Query database
        result = await self.db.execute(
            select(District).where(District.district_code == code)
        )
        district = result.scalar_one_or_none()
        
        if district:
            self._district_cache[code] = district
        
        return district
    
    async def validate_district_code(self, district_code: str) -> tuple[bool, Optional[str], Optional[str]]:
        """
        Validate district code and return district ID.
        
        Args:
            district_code: District code to validate
            
        Returns:
            Tuple of (is_valid, district_id, error_message)
        """
        if not district_code or not district_code.strip():
            return False, None, "District code is required"
        
        district = await self.get_district_by_code(district_code)
        
        if not district:
            return False, None, f"Invalid district code: {district_code}"
        
        return True, str(district.id), None
    
    async def validate_district_codes_batch(self, district_codes: list[str]) -> Dict[str, tuple[bool, Optional[str], Optional[str]]]:
        """
        Validate multiple district codes at once.
        
        Args:
            district_codes: List of district codes to validate
            
        Returns:
            Dictionary mapping district_code to (is_valid, district_id, error_message)
        """
        results = {}
        
        for code in district_codes:
            results[code] = await self.validate_district_code(code)
        
        return results
    
    def get_cached_districts(self) -> Dict[str, District]:
        """
        Get all cached districts.
        
        Returns:
            Dictionary of district_code -> District
        """
        return self._district_cache.copy()
    
    async def get_district_name(self, district_code: str) -> Optional[str]:
        """
        Get district name by code.
        
        Args:
            district_code: District code
            
        Returns:
            District name or None
        """
        district = await self.get_district_by_code(district_code)
        return district.district_name if district else None
