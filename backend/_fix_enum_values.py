"""Fix database status enum values."""
import sqlite3

conn = sqlite3.connect('port_pass.db')
cursor = conn.cursor()

# Check current statuses
cursor.execute('SELECT DISTINCT status FROM visitor_requests')
statuses = [row[0] for row in cursor.fetchall()]
print(f'Current statuses in database: {statuses}')

# Update 'submitted' to 'pending_approval'
if 'submitted' in statuses:
    cursor.execute("UPDATE visitor_requests SET status = 'pending_approval' WHERE status = 'submitted'")
    print(f"Updated records: {cursor.rowcount}")

# Update other old enum values if they exist
old_to_new = {
    'pending_operations_review': 'pending_approval',
    'operations_approved': 'approved',
    'operations_rejected': 'rejected',
}

for old_val, new_val in old_to_new.items():
    cursor.execute(f"UPDATE visitor_requests SET status = '{new_val}' WHERE status = '{old_val}'")
    if cursor.rowcount > 0:
        print(f"Updated {cursor.rowcount} records: '{old_val}' -> '{new_val}'")

conn.commit()
conn.close()
print('✓ Database status values updated')
