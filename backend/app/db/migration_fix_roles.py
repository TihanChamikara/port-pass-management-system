"""
Migration: Update old user roles to new enterprise roles.
"""

from sqlalchemy import text
from app.db.database import SessionLocal, engine
from app.models import User, UserRole
from app.core.security import get_password_hash

def migrate_users():
    db = SessionLocal()
    try:
        # Delete old users with invalid roles
        db.execute(text("DELETE FROM users WHERE role IN ('staff', 'security')"))
        db.commit()
        print("✓ Deleted old users with invalid roles")

        # Seed new enterprise users
        new_users = [
            User(
                username="admin",
                full_name="System Administrator",
                password_hash=get_password_hash("Admin@123"),
                role=UserRole.admin,
            ),
            User(
                username="ops_officer",
                full_name="Operations Officer",
                password_hash=get_password_hash("OpOfficer@123"),
                role=UserRole.operations_officer,
            ),
            User(
                username="pass_officer",
                full_name="Pass Officer",
                password_hash=get_password_hash("PassOfficer@123"),
                role=UserRole.pass_officer,
            ),
            User(
                username="gate_officer",
                full_name="Security Gate Officer",
                password_hash=get_password_hash("GateOfficer@123"),
                role=UserRole.security_gate_officer,
            ),
        ]

        for user in new_users:
            existing = db.query(User).filter(User.username == user.username).first()
            if not existing:
                db.add(user)
            else:
                # Update existing user with correct role
                existing.role = user.role
                existing.password_hash = user.password_hash
                existing.full_name = user.full_name

        db.commit()
        print("✓ Created/updated enterprise users")

        # List all users
        users = db.query(User).all()
        print("\nSeeded Users:")
        for u in users:
            print(f"  ✓ {u.username} ({u.role.value}) - Active: {u.is_active}")

    except Exception as e:
        db.rollback()
        print(f"✗ Migration failed: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    migrate_users()
