from app.db.database import engine
import sqlite3
import os

db_url = str(engine.url)
db_path = db_url.replace("sqlite:///", "")
if not os.path.isabs(db_path):
    db_path = os.path.join(os.getcwd(), db_path)

print(f"Database path: {db_path}")

if not os.path.exists(db_path):
    print("Database file not found.")
else:
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [t[0] for t in cursor.fetchall()]
        print(f"Found tables: {tables}")
        
        target = next((t for t in tables if "pass" in t.lower()), None)
        if target:
            print(f"Inspecting table: {target}")
            cursor.execute(f"PRAGMA table_info({target})")
            for col in cursor.fetchall():
                print(f"Column: {col[1]} ({col[2]})")
            
            cursor.execute(f"SELECT * FROM {target} LIMIT 1")
            row = cursor.fetchone()
            if row:
                cols = [d[0] for d in cursor.description]
                data = dict(zip(cols, row))
                if "zone" in data:
                    print(f"ZONE VALUE: {repr(data['zone'])}")
                    print(f"ZONE TYPE: {type(data['zone'])}")
                else:
                    print(f"Columns in table: {cols}")
            else:
                print("Table is empty.")
        else:
            print("No pass-related table found.")
        conn.close()
    except Exception as e:
        print(f"Error: {e}")
