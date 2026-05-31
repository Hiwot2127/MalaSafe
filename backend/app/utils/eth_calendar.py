"""
Ethiopian Calendar (EC) helpers — minimal stdlib-only conversions.

Used by the malaria CSV parser to translate per-row `Eth_Month_Year` labels
(e.g. "Ginbot 2016") into the (gregorian_month, gregorian_year) pair the
domain model stores. Kept independent of `app/ai/features.py` so the parser
doesn't take a dependency on the AI module.
"""

from typing import Tuple

# Canonical EC month spellings, in order (index 0..12 -> Meskerem..Pagume).
EC_MONTHS = [
    "Meskerem", "Tikimt", "Hidar", "Tahsas", "Tir", "Yekatit", "Megabit",
    "Miazia", "Ginbot", "Sene", "Hamle", "Nehase", "Pagume",
]

# Approximate Gregorian month each EC month starts in.
# Meskerem (~Sep 11), Tikimt (~Oct 11), ..., Pagume (5/6-day intercalary in Sep).
_EC_TO_G_MONTH = {
    "Meskerem": 9, "Tikimt": 10, "Hidar": 11, "Tahsas": 12,
    "Tir": 1, "Yekatit": 2, "Megabit": 3, "Miazia": 4,
    "Ginbot": 5, "Sene": 6, "Hamle": 7, "Nehase": 8, "Pagume": 9,
}


def eth_month_year_to_gregorian(label: str) -> Tuple[int, int]:
    """Convert an EC label like "Ginbot 2016" to (gregorian_month, year). e.g. (5, 2024)."""
    if label is None:
        raise ValueError("Eth_Month_Year is empty")
    tokens = str(label).strip().split()
    if len(tokens) != 2:
        raise ValueError(f"Eth_Month_Year must be '<Month> <Year>', got: {label!r}")
    name_tok, year_tok = tokens
    name = name_tok.strip().title()
    if name not in _EC_TO_G_MONTH:
        raise ValueError(f"Unknown Ethiopian month: {name_tok!r}")
    try:
        ec_year = int(year_tok)
    except ValueError:
        raise ValueError(f"Ethiopian year must be numeric, got: {year_tok!r}")
    g_month = _EC_TO_G_MONTH[name]
    ec_month_index = EC_MONTHS.index(name)
    # Per spec: months from Tir (index 4) onward map to ec_year + 8;
    # Meskerem..Tahsas (indices 0..3) map to ec_year + 7.
    g_year = ec_year + 8 if ec_month_index >= 4 else ec_year + 7
    return g_month, g_year
