from .user import User, UserRole
from .district import District
from .malaria_data import MalariaData
from .climate_data import ClimateData
from .district_environment import DistrictEnvironment
from .prediction import Prediction, RiskLevel
from .alert import Alert
from .uploaded_file import UploadedFile

__all__ = [
    "User",
    "UserRole",
    "District",
    "MalariaData",
    "ClimateData",
    "DistrictEnvironment",
    "Prediction",
    "RiskLevel",
    "Alert",
    "UploadedFile",
]
