"""
Migration: Add missing columns to bring DB schema in sync with models.
- users.department_id (INTEGER, nullable)
- users.role enum: add 'department_manager' value
Run once: python migrate_add_columns.py
"""

import sys
import os
import re
import psycopg2
from dotenv import load_dotenv

# Fix Windows console encoding
sys.stdout.reconfigure(encoding='utf-8')

load_dotenv(".env")

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres@localhost:5432/port_pass_db")

match = re.match(r"postgresql://([^:@]*)(?::([^@]*))?@([^:/]+)(?::(\d+))?/(.+)", DATABASE_URL)
if not match:
    raise ValueError(f"Cannot parse DATABASE_URL: {DATABASE_URL}")

user, password, host, port, dbname = match.groups()
port = int(port) if port else 5432
password = password or ""

conn = psycopg2.connect(host=host, port=port, dbname=dbname, user=user, password=password)
conn.autocommit = True
cur = conn.cursor()

# 1. Add department_id column to users (if missing)
cur.execute("""
    SELECT column_name FROM information_schema.columns
    WHERE table_name='users' AND column_name='department_id'
""")
if not cur.fetchone():
    cur.execute("ALTER TABLE users ADD COLUMN department_id INTEGER;")
    print("[ADDED] users.department_id")
else:
    print("[SKIP]  users.department_id already exists")

# 2. Add 'department_manager' to userrole enum (if missing)
cur.execute("""
    SELECT enumlabel FROM pg_enum
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
    WHERE pg_type.typname = 'userrole' AND enumlabel = 'department_manager'
""")
if not cur.fetchone():
    cur.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'department_manager';")
    print("[ADDED] department_manager to userrole enum")
else:
    print("[SKIP]  userrole.department_manager already exists")

# 3. Create departments table (if missing)
cur.execute("""
    SELECT table_name FROM information_schema.tables
    WHERE table_name='departments'
""")
if not cur.fetchone():
    cur.execute("""
        CREATE TABLE departments (
            id SERIAL PRIMARY KEY,
            name VARCHAR(150) UNIQUE NOT NULL,
            description VARCHAR(500),
            manager_name VARCHAR(150),
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW()
        );
    """)
    print("[ADDED] departments table created")
else:
    print("[SKIP]  departments table already exists")

# 4. Seed departments
default_departments = [
    ("HR & Administration",    "HR Manager"),
    ("Commercial & Marketing", "Commercial Manager"),
    ("IT",                     "IT Manager"),
    ("Engineering",            "Engineering Manager"),
    ("Operations",             "Operations Manager"),
    ("Security",               "Security Manager"),
    ("Project Team",           "Project Manager"),
    ("HSE Department",         "HSE Manager"),
    ("Techno Commercial",      "Techno Commercial Manager"),
    ("Finance",                "Finance Manager"),
]
for name, mgr in default_departments:
    cur.execute("SELECT id FROM departments WHERE name=%s", (name,))
    if not cur.fetchone():
        cur.execute("INSERT INTO departments (name, manager_name) VALUES (%s, %s)", (name, mgr))
        print(f"[ADDED] Department: {name}")
    else:
        print(f"[SKIP]  Department already exists: {name}")

# 5. Add department_id / department_name to visitor_requests (if missing)
for col, col_type in [("department_id", "INTEGER"), ("department_name", "VARCHAR(150)")]:
    cur.execute(f"""
        SELECT column_name FROM information_schema.columns
        WHERE table_name='visitor_requests' AND column_name='{col}'
    """)
    if not cur.fetchone():
        cur.execute(f"ALTER TABLE visitor_requests ADD COLUMN {col} {col_type};")
        print(f"[ADDED] visitor_requests.{col}")
    else:
        print(f"[SKIP]  visitor_requests.{col} already exists")

# 6. Add pending_department_approval to requeststatus enum (if missing)
cur.execute("""
    SELECT enumlabel FROM pg_enum
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
    WHERE pg_type.typname = 'requeststatus' AND enumlabel = 'pending_department_approval'
""")
if not cur.fetchone():
    cur.execute("ALTER TYPE requeststatus ADD VALUE IF NOT EXISTS 'pending_department_approval';")
    print("[ADDED] pending_department_approval to requeststatus enum")
else:
    print("[SKIP]  requeststatus.pending_department_approval already exists")

cur.close()
conn.close()
print("\nMigration complete.")
