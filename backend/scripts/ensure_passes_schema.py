from app.db.compat import ensure_passes_schema
from app.db.database import engine


if __name__ == "__main__":
    ensure_passes_schema(engine)
    print("passes schema migrated")
