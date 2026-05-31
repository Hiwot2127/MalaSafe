"""
Script to test CSV upload functionality.

Usage:
    python test_uploads.py
"""

import requests
import csv
from io import StringIO

BASE_URL = "http://localhost:8000/api/v1"


def create_test_csv(data, headers):
    """Create CSV content from data."""
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    for row in data:
        writer.writerow(row)
    return output.getvalue()


def test_monthly_malaria_upload():
    """Test monthly malaria data upload."""
    print("\n" + "=" * 60)
    print("Testing Monthly Malaria Upload")
    print("=" * 60)

    # Get credentials
    email = input("Enter email [admin@malasafe.gov.et]: ").strip() or "admin@malasafe.gov.et"
    password = input("Enter password: ").strip()

    # Login
    print("\n1. Logging in...")
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": email, "password": password}
    )

    if response.status_code != 200:
        print(f"❌ Login failed: {response.text}")
        return

    token = response.json()["access_token"]
    print("✅ Login successful")

    # Create test CSV
    print("\n2. Creating test CSV...")
    csv_data = [
        ['JgBKioqJo5h', 'Ginbot 2016', '12', '45', '210'],
        ['jKfQ1lzqQOg', 'Hamle 2015', '3', '18', '160'],
        ['gN2EJsiQS3J', 'Sene 2016', '7', '32', '180'],
    ]
    csv_content = create_test_csv(csv_data, ['organisationunitid', 'Eth_Month_Year', 'Travel', 'Positive', 'Tests'])
    
    # Upload
    print("\n3. Uploading CSV...")
    files = {'file': ('test_monthly.csv', csv_content, 'text/csv')}
    headers = {'Authorization': f'Bearer {token}'}
    
    response = requests.post(
        f"{BASE_URL}/uploads/malaria/monthly",
        files=files,
        headers=headers
    )
    
    if response.status_code == 200:
        result = response.json()
        print("✅ Upload successful!")
        print(f"   Records processed: {result['records_processed']}")
        print(f"   Records created: {result['records_created']}")
        print(f"   Records skipped: {result['records_skipped']}")
        print(f"   Errors: {len(result['errors'])}")
        
        if result['errors']:
            print("\n   Validation Errors:")
            for error in result['errors']:
                print(f"   - Row {error.get('row')}: {error.get('error')}")
    else:
        print(f"❌ Upload failed: {response.text}")


def test_climate_upload():
    """Test climate data upload."""
    print("\n" + "=" * 60)
    print("Testing Climate Data Upload")
    print("=" * 60)
    
    # Get credentials
    email = input("Enter email [admin@malasafe.gov.et]: ").strip() or "admin@malasafe.gov.et"
    password = input("Enter password: ").strip()
    
    # Login
    print("\n1. Logging in...")
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": email, "password": password}
    )
    
    if response.status_code != 200:
        print(f"❌ Login failed: {response.text}")
        return
    
    token = response.json()["access_token"]
    print("✅ Login successful")
    
    # Create test CSV
    print("\n2. Creating test CSV...")
    csv_data = [
        ['AA-001', '2024-01-15', '5.2', '22.5'],
        ['OR-001', '2024-01-15', '12.8', '24.3'],
        ['AM-001', '2024-01-15', '8.5', '20.1'],
    ]
    csv_content = create_test_csv(csv_data, ['district_code', 'date', 'rainfall', 'temperature'])
    
    # Upload
    print("\n3. Uploading CSV...")
    files = {'file': ('test_climate.csv', csv_content, 'text/csv')}
    headers = {'Authorization': f'Bearer {token}'}
    
    response = requests.post(
        f"{BASE_URL}/uploads/climate",
        files=files,
        headers=headers
    )
    
    if response.status_code == 200:
        result = response.json()
        print("✅ Upload successful!")
        print(f"   Records processed: {result['records_processed']}")
        print(f"   Records created: {result['records_created']}")
        print(f"   Records skipped: {result['records_skipped']}")
        print(f"   Errors: {len(result['errors'])}")
        
        if result['errors']:
            print("\n   Validation Errors:")
            for error in result['errors']:
                print(f"   - Row {error.get('row')}: {error.get('error')}")
    else:
        print(f"❌ Upload failed: {response.text}")


def test_template_downloads():
    """Test template downloads."""
    print("\n" + "=" * 60)
    print("Testing Template Downloads")
    print("=" * 60)
    
    templates = [
        ("Monthly Malaria", f"{BASE_URL}/uploads/templates/malaria/monthly"),
        ("Climate Data", f"{BASE_URL}/uploads/templates/climate"),
    ]
    
    for name, url in templates:
        print(f"\nDownloading {name} template...")
        response = requests.get(url)
        
        if response.status_code == 200:
            print(f"✅ {name} template downloaded")
            print(f"   Content preview:")
            lines = response.text.split('\n')[:3]
            for line in lines:
                print(f"   {line}")
        else:
            print(f"❌ Failed to download {name} template")


def main():
    """Main test function."""
    print("\n" + "=" * 60)
    print("CSV Upload System Test")
    print("=" * 60)
    print("\nMake sure the backend server is running on http://localhost:8000")
    print()
    
    while True:
        print("\nSelect test:")
        print("1. Test Monthly Malaria Upload")
        print("2. Test Climate Data Upload")
        print("3. Test Template Downloads")
        print("4. Run All Tests")
        print("0. Exit")

        choice = input("\nEnter choice: ").strip()

        if choice == '1':
            test_monthly_malaria_upload()
        elif choice == '2':
            test_climate_upload()
        elif choice == '3':
            test_template_downloads()
        elif choice == '4':
            test_template_downloads()
            test_monthly_malaria_upload()
            test_climate_upload()
        elif choice == '0':
            print("\nExiting...")
            break
        else:
            print("Invalid choice")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nTest cancelled by user")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
