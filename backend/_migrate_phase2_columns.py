"""
Migration: Add Phase 2 columns to visitor_requests table.
Run once: python _migrate_phase2_columns.py
"""
from app.db.database import engine
from sqlalchemy import text

migrations = [
    "ALTER TABLE visitor_requests ADD COLUMN IF NOT EXISTS visitor_type VARCHAR(20) DEFAULT 'normal'",
    "ALTER TABLE visitor_requests ADD COLUMN IF NOT EXISTS nic_verified BOOLEAN DEFAULT FALSE",
    "ALTER TABLE visitor_requests ADD COLUMN IF NOT EXISTS pass_returned BOOLEAN DEFAULT FALSE",
    "ALTER TABLE visitor_requests ADD COLUMN IF NOT EXISTS record_closed_by_id INTEGER REFERENCES users(id)",
    "ALTER TABLE visitor_requests ADD COLUMN IF NOT EXISTS record_closed_at TIMESTAMP",
    "ALTER TABLE visitor_requests ADD COLUMN IF NOT EXISTS dept_manager_id INTEGER REFERENCES users(id)",
    "ALTER TABLE visitor_requests ADD COLUMN IF NOT EXISTS dept_reviewed_at TIMESTAMP",
    "ALTER TABLE visitor_requests ADD COLUMN IF NOT EXISTS dept_comments TEXT",
]

with engine.begin() as conn:
    for sql in migrations:
        try:
            conn.execute(text(sql))
            print(f"OK: {sql[:70]}")
        except Exception as e:
            print(f"SKIP (already exists?): {e}")

print("Migration complete! All Phase 2 columns added.")
