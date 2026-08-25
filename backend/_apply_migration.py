"""Apply database migration to add new columns to visitor_requests table."""
import sqlite3
import os

# Connect to the database
db_path = "./port_pass.db"
if not os.path.exists(db_path):
    print(f"Error: Database file not found at {db_path}")
    print(f"Current directory: {os.getcwd()}")
    print(f"Files in current directory: {os.listdir('.')}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get existing columns
cursor.execute("PRAGMA table_info(visitor_requests)")
existing_columns = {col[1] for col in cursor.fetchall()}
print(f"Existing columns: {len(existing_columns)}")

# List of columns to add with their definitions
new_columns = {
    "visitor_phone": "VARCHAR(20)",
    "visitor_nic": "VARCHAR(20)",
    "visitor_organization": "VARCHAR(150)",
    "visitor_photo_url": "TEXT",
    "visit_building_department": "VARCHAR(150)",
    "host_employee_id": "INTEGER",  # Removed REFERENCES constraint for SQLite compatibility
    "host_employee_name": "VARCHAR(150)",
    "vehicle_number": "VARCHAR(50)",
    "carrying_equipment": "BOOLEAN DEFAULT 0",
    "equipment_description": "TEXT",
    "rejection_reason": "TEXT",
    "gate_officer_checked_in_id": "INTEGER",  # Removed REFERENCES constraint for SQLite compatibility
    "checked_in_at": "DATETIME",
    "gate_officer_checked_out_id": "INTEGER",  # Removed REFERENCES constraint for SQLite compatibility
    "checked_out_at": "DATETIME",
    "workflow_transitions": "TEXT DEFAULT '{}'",
    "additional_notes": "TEXT",
    "supporting_docs_urls": "TEXT"
}

# Add missing columns
added_count = 0
for col_name, col_def in new_columns.items():
    if col_name not in existing_columns:
        try:
            cursor.execute(f"ALTER TABLE visitor_requests ADD COLUMN {col_name} {col_def}")
            print(f"✓ Added column: {col_name}")
            added_count += 1
        except Exception as e:
            print(f"✗ Error adding {col_name}: {e}")
    else:
        print(f"  Column already exists: {col_name}")

conn.commit()
conn.close()

print(f"\n✓ Migration complete: {added_count} new columns added")
