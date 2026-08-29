from sqlalchemy import text
from app.db.database import engine

def fix_enums():
    new_actions = [
        "REQUEST_CREATED",
        "TRANSITION_TO_PENDING_APPROVAL",
        "TRANSITION_TO_UNDER_REVIEW",
        "TRANSITION_TO_APPROVED",
        "TRANSITION_TO_REJECTED",
        "TRANSITION_TO_ISSUED",
        "TRANSITION_TO_CHECKED_IN",
        "TRANSITION_TO_CHECKED_OUT",
        "TRANSITION_TO_EXPIRED",
        "TRANSITION_TO_CANCELLED"
    ]
    
    new_entities = [
        "visitor_request"
    ]
    
    print("Connecting to database...")
    with engine.connect() as conn:
        conn = conn.execution_options(isolation_level="AUTOCOMMIT")
        
        # Check current enum values for auditactiontype
        try:
            res = conn.execute(text("SELECT enum_range(NULL::auditactiontype)"))
            db_range_str = res.fetchone()[0] # e.g. "{CREATE,UPDATE,...}"
            # parse the postgres array representation: strip '{' and '}' and split by ','
            current_actions = [x.strip() for x in db_range_str.strip('{}').split(',')]
            print("Current auditactiontype values in DB:", current_actions)
        except Exception as e:
            print("Could not fetch auditactiontype:", e)
            current_actions = []
            
        for action in new_actions:
            if action not in current_actions:
                try:
                    print(f"Adding action: {action} to auditactiontype")
                    conn.execute(text(f"ALTER TYPE auditactiontype ADD VALUE '{action}'"))
                    print(f"SUCCESS: Added {action}")
                except Exception as e:
                    print(f"Error adding {action}: {e}")
            else:
                print(f"Action {action} already exists in DB enum")
                
        # Check current enum values for auditentitytype
        try:
            res = conn.execute(text("SELECT enum_range(NULL::auditentitytype)"))
            db_range_str = res.fetchone()[0]
            current_entities = [x.strip() for x in db_range_str.strip('{}').split(',')]
            print("Current auditentitytype values in DB:", current_entities)
        except Exception as e:
            print("Could not fetch auditentitytype:", e)
            current_entities = []
            
        for entity in new_entities:
            if entity not in current_entities:
                try:
                    print(f"Adding entity: {entity} to auditentitytype")
                    conn.execute(text(f"ALTER TYPE auditentitytype ADD VALUE '{entity}'"))
                    print(f"SUCCESS: Added {entity}")
                except Exception as e:
                    print(f"Error adding {entity}: {e}")
            else:
                print(f"Entity {entity} already exists in DB enum")

if __name__ == "__main__":
    fix_enums()
