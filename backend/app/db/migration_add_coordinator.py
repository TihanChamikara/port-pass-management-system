import os
from sqlalchemy import text
from app.db.database import SessionLocal

def run_migration():
    db = SessionLocal()
    try:
        # Add new role to enum (PostgreSQL)
        try:
            db.execute(text("ALTER TYPE userrole ADD VALUE 'department_coordinator'"))
            db.commit()
            print("Added 'department_coordinator' to userrole enum")
        except Exception as e:
            db.rollback()
            print("Enum value might already exist or error occurred:", e)
        
        # Add represented_hod_id column
        try:
            db.execute(text("ALTER TABLE users ADD COLUMN represented_hod_id INTEGER REFERENCES users(id)"))
            db.commit()
            print("Added represented_hod_id column")
        except Exception as e:
            db.rollback()
            print("Column might already exist or error occurred:", e)
            
    except Exception as e:
        db.rollback()
        print("Migration failed:", e)
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
