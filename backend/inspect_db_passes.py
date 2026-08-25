from app.db.database import engine
import sqlite3
import os

db_url = str(engine.url)
db_path = db_url.replace("sqlite:///", "")
if not os.path.isabs(db_path):
    db_path = os.path.join(os.getcwd(), db_path)

print(f"Database path: {db_path}")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    target = "passes"
    print(f"Inspecting table: {target}")
    cursor.execute(f"PRAGMA table_info({target})")
    for col in cursor.fetchall():
        print(f"Column: {col[1]} ({col[2]})")
    
    cursor.execute(f"SELECT * FROM {target} LIMIT 1")
    row = cursor.fetchone()
    if row:
        cols = [d[0] for d in cursor.description]
        data = dict(zip(cols, row))
        print(f"DATA FOUND in {target}:")
        for k, v in data.items():
            print(f"  {k}: {repr(v)} ({type(v)})")
    else:
        print(f"Table {target} is empty.")
    conn.close()
except Exception as e:
    print(f"Error: {e}")
