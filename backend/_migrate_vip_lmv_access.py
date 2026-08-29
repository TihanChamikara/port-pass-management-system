"""
Migration: Add vip_lmv_access column to visitor_requests table.
Run once: python _migrate_vip_lmv_access.py
"""
import os
import sys
import psycopg2
from dotenv import load_dotenv

# Fix Windows console encoding
sys.stdout.reconfigure(encoding='utf-8')

load_dotenv(".env")

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres@localhost:5432/port_pass_db")

print(f"Connecting to database to run migration: {DATABASE_URL}")

try:
    import re
    match = re.match(r"postgresql://([^:@]*)(?::([^@]*))?@([^:/]+)(?::(\d+))?/(.+)", DATABASE_URL)
    if not match:
        raise ValueError(f"Cannot parse DATABASE_URL: {DATABASE_URL}")

    user, password, host, port, dbname = match.groups()
    port = int(port) if port else 5432
    password = password or ""

    conn = psycopg2.connect(host=host, port=port, dbname=dbname, user=user, password=password)
    conn.autocommit = True
    cur = conn.cursor()

    cur.execute("""
        SELECT column_name FROM information_schema.columns
        WHERE table_name='visitor_requests' AND column_name='vip_lmv_access'
    """)
    if not cur.fetchone():
        cur.execute("ALTER TABLE visitor_requests ADD COLUMN vip_lmv_access VARCHAR(50);")
        print("[ADDED] visitor_requests.vip_lmv_access column")
    else:
        print("[SKIP] visitor_requests.vip_lmv_access column already exists")

    cur.close()
    conn.close()
    print("Migration successful.")
except Exception as e:
    print(f"Migration failed: {e}")
    sys.exit(1)
