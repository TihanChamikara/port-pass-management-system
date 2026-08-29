# No requests import
# Need to authenticate first or test it if there is a dev bypass
# Better to run backend function directly

from app.db.database import SessionLocal
from app.services.pass_service import create_single_pass
from app.schemas.pass_record import PassCreate
from app.models.pass_record import PassType, Zone
from app.models.user import User

db = SessionLocal()
user = db.query(User).first()
if not user:
    print("No user found")
    exit(1)

payload = PassCreate(
    visitor_name="Test",
    company_name="Test Co",
    nic_number="123456789V",
    contact_number="0712345678",
    pass_type=PassType.blue,
    zone=Zone.zone_1
)
try:
    print("User:", user.username, "Role:", user.role)
    pass_record = create_single_pass(db, payload, user)
    print("Success create:", pass_record.id)
    from app.schemas.pass_record import PassResponse
    response = PassResponse.model_validate(pass_record)
    print("Success serialize!")
except Exception as e:
    import traceback
    traceback.print_exc()
