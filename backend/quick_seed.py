"""Quick seed facility mappings without pandas dependency."""
import csv
import psycopg2

# Read crosswalk CSV
crosswalk_path = "temp/climate-pipeline/crosswalk/facility_to_pcode.csv"

print("Reading crosswalk file...")
mappings = []
with open(crosswalk_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        org_name = row['organisationunitname']
        pcode = row['ADM3_PCODE']
        mappings.append((org_name, pcode))

print(f"Found {len(mappings)} mappings in crosswalk")

# Read actual facility IDs from historical data
print("\nReading historical facility IDs...")
facility_ids = {}
csv_file = "temp/final_processed_df_2016EC.csv"

with open(csv_file, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        org_name = row['organisationunitname']
        facility_id = row['organisationunitid']
        # Store first occurrence of each org unit name -> facility ID
        if org_name not in facility_ids:
            facility_ids[org_name] = facility_id

print(f"Found {len(facility_ids)} unique facility IDs")
print("\nSample facility IDs:")
for i, (name, fid) in enumerate(list(facility_ids.items())[:5]):
    print(f"  {name[:40]:<40} → {fid}")

# Connect to database
print("\nConnecting to database...")
conn = psycopg2.connect(
    host="localhost",
    port=5432,
    database="malasafe",
    user="malasafe"
)

cur = conn.cursor()

# Update districts with facility IDs
print("\nUpdating districts...")
updated = 0
not_found = []

for org_name, pcode in mappings:
    facility_id = facility_ids.get(org_name)
    
    if not facility_id:
        # Try without "Woreda" suffix
        alt_name = org_name.replace(" Woreda", "").replace(" Town", "")
        facility_id = facility_ids.get(alt_name)
    
    if facility_id:
        cur.execute("""
            UPDATE districts 
            SET organisationunitid = %s
            WHERE adm3_pcode = %s OR district_code = %s
            RETURNING district_name;
        """, (facility_id, pcode, pcode))
        
        result = cur.fetchone()
        if result:
            updated += 1
            if updated <= 5:
                print(f"  ✓ {result[0]:<30} → {facility_id}")
        else:
            not_found.append((org_name, pcode, facility_id))
    else:
        not_found.append((org_name, pcode, None))

conn.commit()

print(f"\n✓ Updated {updated} districts with facility IDs")

if not_found:
    print(f"\n⚠ {len(not_found)} not mapped:")
    for org, pcode, fid in not_found[:5]:
        status = f"ID={fid}" if fid else "No ID found"
        print(f"    {org[:35]:<35} {pcode} ({status})")

# Show Gambela mappings
print("\n✓ Gambela districts mapped:")
cur.execute("""
    SELECT district_name, district_code, organisationunitid
    FROM districts 
    WHERE region = 'Gambela' AND organisationunitid IS NOT NULL
    ORDER BY district_name;
""")

for row in cur.fetchall():
    print(f"  {row[0]:<25} {row[1]:<12} → {row[2]}")

cur.close()
conn.close()

print("\n✅ Done! Malaria uploads should now work.")
