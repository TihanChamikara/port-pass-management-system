"""
Migration: Add department support to the Port Pass database.

This script:
1. Adds 'pending_department_approval' to the requeststatus enum (PostgreSQL)
2. Adds 'department_approval' to the approvalstage enum (PostgreSQL)
3. Adds department_id and department_name columns to visitor_requests table
4. Creates the departments table

Run this ONCE before restarting the backend after pulling the new code.

Usage (from the backend directory, with venv activated):
    python _migrate_department.py
"""

import os
import sys

# Ensure the app package is importable
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.settings import get_settings
from sqlalchemy import create_engine, text

settings = get_settings()
engine = create_engine(settings.database_url)


def migrate():
    with engine.connect() as conn:
        is_pg = settings.database_url.startswith("postgresql")

        if is_pg:
            print("PostgreSQL detected — running enum and column migrations...")

            # 1. Add new enum value to requeststatus
            try:
                conn.execute(text(
                    "ALTER TYPE requeststatus ADD VALUE IF NOT EXISTS 'pending_department_approval' BEFORE 'pending_approval';"
                ))
                print("  [OK] Added 'pending_department_approval' to requeststatus enum")
            except Exception as e:
                print(f"  [SKIP] requeststatus enum: {e}")

            # 2. Add new enum value to approvalstage
            try:
                conn.execute(text(
                    "ALTER TYPE approvalstage ADD VALUE IF NOT EXISTS 'department_approval' BEFORE 'operations_validation';"
                ))
                print("  [OK] Added 'department_approval' to approvalstage enum")
            except Exception as e:
                print(f"  [SKIP] approvalstage enum: {e}")

            conn.commit()

        # 3. Create departments table if it doesn't exist
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS departments (
                id SERIAL PRIMARY KEY,
                name VARCHAR(150) UNIQUE NOT NULL,
                description VARCHAR(500),
                manager_name VARCHAR(150),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_departments_name ON departments (name);"))
        print("  [OK] departments table ready")

        # 4. Add department columns to visitor_requests
        if is_pg:
            try:
                conn.execute(text(
                    "ALTER TABLE visitor_requests ADD COLUMN IF NOT EXISTS department_id INTEGER;"
                ))
                print("  [OK] Added department_id column to visitor_requests")
            except Exception as e:
                print(f"  [SKIP] department_id: {e}")

            try:
                conn.execute(text(
                    "ALTER TABLE visitor_requests ADD COLUMN IF NOT EXISTS department_name VARCHAR(150);"
                ))
                print("  [OK] Added department_name column to visitor_requests")
            except Exception as e:
                print(f"  [SKIP] department_name: {e}")
        else:
            # SQLite — columns are added via SQLAlchemy create_all on startup (no ADD COLUMN IF NOT EXISTS needed)
            print("  [INFO] SQLite: department columns will be created by SQLAlchemy on startup")

        conn.commit()
        print("\nMigration complete!")


if __name__ == "__main__":
    migrate()
