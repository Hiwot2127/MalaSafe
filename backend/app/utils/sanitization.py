"""Input sanitization utilities to prevent injection attacks."""

import re
from typing import Any

# CSV injection prefixes that Excel/LibreOffice interpret as formulas
CSV_INJECTION_PREFIXES = ['=', '+', '-', '@', '\t', '\r']


def sanitize_csv_value(value: Any) -> str:
    """
    Sanitize a value for CSV export to prevent formula injection.
    
    Args:
        value: Value to sanitize
        
    Returns:
        Sanitized string safe for CSV export
    """
    if value is None:
        return ""
    
    str_value = str(value).strip()
    
    # If value starts with dangerous character, prefix with single quote
    if str_value and str_value[0] in CSV_INJECTION_PREFIXES:
        return f"'{str_value}"
    
    return str_value


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename to prevent directory traversal.
    
    Args:
        filename: Original filename
        
    Returns:
        Sanitized filename
    """
    # Remove path separators
    filename = filename.replace('/', '_').replace('\\', '_')
    
    # Remove null bytes
    filename = filename.replace('\x00', '')
    
    # Keep only alphanumeric, dash, underscore, dot
    filename = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)
    
    # Limit length
    if len(filename) > 255:
        name, ext = filename.rsplit('.', 1) if '.' in filename else (filename, '')
        filename = name[:250] + ('.' + ext if ext else '')
    
    return filename


def sanitize_search_query(query: str) -> str:
    """
    Sanitize search query to prevent injection attacks.
    
    Args:
        query: User search query
        
    Returns:
        Sanitized query
    """
    if not query:
        return ""
    
    # Remove null bytes
    query = query.replace('\x00', '')
    
    # Limit length
    query = query[:200]
    
    return query.strip()
