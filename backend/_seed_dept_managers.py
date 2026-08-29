"""Seed department manager accounts. Run once."""
from app.db.database import SessionLocal
from app.models import User, UserRole, Department
from app.core.security import get_password_hash

db = SessionLocal()
try:
    dept_manager_accounts = [
        {"username": "dm_hr",          "full_name": "HR and Admin Manager",        "dept_name": "HR & Administration"},
        {"username": "dm_commercial",  "full_name": "Commercial Manager",           "dept_name": "Commercial & Marketing"},
        {"username": "dm_it",          "full_name": "IT Manager",                  "dept_name": "IT"},
        {"username": "dm_engineering", "full_name": "Engineering Manager",          "dept_name": "Engineering"},
        {"username": "dm_operations",  "full_name": "Operations Manager",           "dept_name": "Operations"},
        {"username": "dm_security",    "full_name": "Security Manager",             "dept_name": "Security"},
        {"username": "dm_project",     "full_name": "Project Manager",              "dept_name": "Project Team"},
        {"username": "dm_hse",         "full_name": "HSE Manager",                 "dept_name": "HSE Department"},
        {"username": "dm_techno",      "full_name": "Techno Commercial Manager",    "dept_name": "Techno Commercial"},
        {"username": "dm_finance",     "full_name": "Finance Manager",              "dept_name": "Finance"},
    ]
    created = 0
    for dm in dept_manager_accounts:
        existing = db.query(User).filter(User.username == dm["username"]).first()
        if not existing:
            dept = db.query(Department).filter(Department.name == dm["dept_name"]).first()
            dept_id = dept.id if dept else None
            db.add(User(
                username=dm["username"],
                full_name=dm["full_name"],
                password_hash=get_password_hash("DeptManager@123"),
                role=UserRole.department_manager,
                department_id=dept_id,
            ))
            print(f"Created: {dm['username']} (dept_id={dept_id})")
            created += 1
        else:
            print(f"Already exists: {dm['username']}")
    db.commit()
    print(f"\nDone. {created} new accounts created.")
finally:
    db.close()
