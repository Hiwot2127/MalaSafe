"""
Season generation utilities for climate data.

Ethiopian seasons:
- Bega (Dry season): October - January
- Belg (Small rainy season): February - May
- Kiremt (Main rainy season): June - September
"""

from datetime import date
from typing import Optional


class SeasonGenerator:
    """Utility for determining Ethiopian seasons from dates."""
    
    # Ethiopian season definitions
    SEASONS = {
        'bega': {'name': 'Bega (Dry)', 'months': [10, 11, 12, 1]},
        'belg': {'name': 'Belg (Small Rainy)', 'months': [2, 3, 4, 5]},
        'kiremt': {'name': 'Kiremt (Main Rainy)', 'months': [6, 7, 8, 9]}
    }
    
    @classmethod
    def get_season_from_date(cls, date_value: date) -> str:
        """
        Get Ethiopian season from date.
        
        Args:
            date_value: Date to get season for
            
        Returns:
            Season name (bega, belg, or kiremt)
        """
        month = date_value.month
        
        if month in cls.SEASONS['bega']['months']:
            return 'bega'
        elif month in cls.SEASONS['belg']['months']:
            return 'belg'
        elif month in cls.SEASONS['kiremt']['months']:
            return 'kiremt'
        else:
            # Fallback (should not happen)
            return 'unknown'
    
    @classmethod
    def get_season_from_month(cls, month: int) -> str:
        """
        Get Ethiopian season from month number.
        
        Args:
            month: Month number (1-12)
            
        Returns:
            Season name (bega, belg, or kiremt)
        """
        if month in cls.SEASONS['bega']['months']:
            return 'bega'
        elif month in cls.SEASONS['belg']['months']:
            return 'belg'
        elif month in cls.SEASONS['kiremt']['months']:
            return 'kiremt'
        else:
            return 'unknown'
    
    @classmethod
    def get_season_display_name(cls, season_code: str) -> str:
        """
        Get display name for season code.
        
        Args:
            season_code: Season code (bega, belg, kiremt)
            
        Returns:
            Display name
        """
        if season_code in cls.SEASONS:
            return cls.SEASONS[season_code]['name']
        return season_code.capitalize()
    
    @classmethod
    def get_all_seasons(cls) -> dict:
        """
        Get all season definitions.
        
        Returns:
            Dictionary of season definitions
        """
        return cls.SEASONS.copy()
    
    @classmethod
    def is_rainy_season(cls, season_code: str) -> bool:
        """
        Check if season is a rainy season.
        
        Args:
            season_code: Season code
            
        Returns:
            True if rainy season
        """
        return season_code in ['belg', 'kiremt']
    
    @classmethod
    def is_dry_season(cls, season_code: str) -> bool:
        """
        Check if season is dry season.
        
        Args:
            season_code: Season code
            
        Returns:
            True if dry season
        """
        return season_code == 'bega'
