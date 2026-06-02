"""Quick script to run the organisationunitid migration directly."""
import psycopg2

# Database connection (using trust authentication from docker-compose)
conn = psycopg2.connect(
    host="localhost",
    port=5432,
    database="malasafe",
    user="malasafe"
)

try:
    cur = conn.cursor()
    
    # Check if column already exists
    cur.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='districts' AND column_name='organisationunitid';
    """)
    
    if cur.fetchone():
        print("✓ Column 'organisationunitid' already exists in districts table")
    else:
        print("Adding 'organisationunitid' column to districts table...")
        
        # Add the column
        cur.execute("""
            ALTER TABLE districts 
            ADD COLUMN organisationunitid VARCHAR(50);
        """)
        
        # Add index
        cur.execute("""
            CREATE INDEX idx_district_orgunitid 
            ON districts(organisationunitid);
        """)
        
        # Update alembic version table
        cur.execute("""
            INSERT INTO alembic_version (version_num) 
            VALUES ('009')
            ON CONFLICT (version_num) DO NOTHING;
        """)
        
        conn.commit()
        print("✓ Successfully added organisationunitid column and index")
        print("✓ Updated alembic_version to 009")
    
    # Show current schema
    cur.execute("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name='districts'
        ORDER BY ordinal_position;
    """)
    
    print("\nCurrent districts table schema:")
    print("-" * 60)
    for row in cur.fetchall():
        print(f"  {row[0]:<30} {row[1]:<20} NULL: {row[2]}")
    
    cur.close()
    
except Exception as e:
    print(f"✗ Error: {e}")
    conn.rollback()
finally:
    conn.close()
