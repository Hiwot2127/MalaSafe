"""Probe py-ethiopian-date-converter API and verify anchor dates."""
from ethiopian_date_converter.ethiopian_date_convertor import (
    create_ethiopian_date_from_parts,
    to_gregorian,
    is_leap_year_et,
    ethiopian_month_length,
)

anchors = [
    ("Meskerem 1, 2016 EC", 2016, 1, 1, (2023, 9, 12)),
    ("Hamle 1, 2015 EC",     2015, 11, 1, (2023, 7, 8)),
    ("Sene 30, 2016 EC",     2016, 10, 30, (2024, 7, 7)),
    ("Yekatit 1, 2016 EC",   2016, 6, 1, (2024, 2, 9)),
    ("Pagume 5, 2015 EC",    2015, 13, 5, (2023, 9, 11)),
]
print("=== Anchor conversions ===")
all_ok = True
for label, y, m, d, expected in anchors:
    et = create_ethiopian_date_from_parts(d, m, y)
    g = to_gregorian(et)
    got = (g.year, g.month, g.day)
    ok = got == expected
    all_ok &= ok
    print(f"{'OK' if ok else 'FAIL'}  {label:25s} -> {got}  (expected {expected})")

print("\n=== Pagume length ===")
for y in (2015, 2016, 2017):
    print(f"EC {y}: leap={is_leap_year_et(y)}, Pagume days={ethiopian_month_length(13, y)}")

print("\n=== Per-month length (EC 2016) ===")
for m in range(1, 14):
    print(f"  month {m:2d}: {ethiopian_month_length(m, 2016)} days")

print("\nALL OK" if all_ok else "\nSOME FAILED")
