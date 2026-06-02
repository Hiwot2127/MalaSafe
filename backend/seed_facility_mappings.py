"""Seed facility-to-district mappings from crosswalk CSV."""
import pandas as pd
from pathlib import Path
import psycopg2
from psycopg2.extras import execute_batch

# Paths
CROSSWALK_CSV = Path(__file__).parent / "temp" / "climate-pipeline" / "crosswalk" / "facility_to_pcode.csv"

# Database connection
conn = psycopg2.connect(
    host="localhost",
    port=5432,
    database="malasafe",
    user="malasafe"
)

try:
    if not CROSSWALK_CSV.exists():
        print(f"✗ Crosswalk file not found: {CROSSWALK_CSV}")
        print("  This file maps DHIS2 facility IDs to district codes.")
        print("  Without it, malaria uploads using organisationunitid won't work.")
        exit(1)
    
    print(f"Reading crosswalk from: {CROSSWALK_CSV}")
    df = pd.read_csv(CROSSWALK_CSV)
    
    print(f"Found {len(df)} facility mappings")
    print(f"Columns: {list(df.columns)}")
    print(f"\nSample rows:")
    print(df.head(3))
    
    cur = conn.cursor()
    
    # Get list of DHIS2 org unit IDs from actual data files
    # We need to map organisationunitname from crosswalk to actual facility IDs
    # For now, we'll use organisationunitname as the ID (simplification)
    
    updated = 0
    not_found = []
    
    for _, row in df.iterrows():
        pcode = row['ADM3_PCODE']
        org_name = row['organisationunitname']
        
        # Update district with this org unit ID
        # Note: Using org name as ID for now; in production you'd map actual DHIS2 IDs
        cur.execute("""
            UPDATE districts 
            SET organisationunitid = %s
            WHERE adm3_pcode = %s OR district_code = %s
            RETURNING id;
        """, (org_name, pcode, pcode))
        
        if cur.fetchone():
            updated += 1
        else:
            not_found.append((org_name, pcode))
    
    conn.commit()
    
    print(f"\n✓ Updated {updated} districts with facility mappings")
    
    if not_found:
        print(f"\n⚠ {len(not_found)} mappings had no matching district:")
        for org, pcode in not_found[:5]:
            print(f"    {org} → {pcode}")
        if len(not_found) > 5:
            print(f"    ... and {len(not_found) - 5} more")
    
    # Show sample of what was mapped
    cur.execute("""
        SELECT district_code, district_name, organisationunitid
        FROM districts 
        WHERE organisationunitid IS NOT NULL
        LIMIT 10;
    """)
    
    print("\n✓ Sample mapped districts:")
    print("-" * 80)
    for row in cur.fetchall():
        print(f"  {row[0]:<15} {row[1]:<40} → {row[2]}")
    
    cur.close()
    
except Exception as e:
    print(f"✗ Error: {e}")
    conn.rollback()
finally:
    conn.close()
