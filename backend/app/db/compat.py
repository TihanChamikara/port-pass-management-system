import logging

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)


def ensure_users_schema(engine: Engine) -> None:
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("users")}
    is_sqlite = engine.dialect.name == "sqlite"

    with engine.begin() as connection:
        if "is_active" not in columns:
            bool_def = "DEFAULT 1" if is_sqlite else "DEFAULT TRUE"
            connection.execute(text(f"ALTER TABLE users ADD COLUMN is_active BOOLEAN {bool_def}"))
        if "created_at" not in columns:
            time_type = "DATETIME" if is_sqlite else "TIMESTAMP"
            connection.execute(text(f"ALTER TABLE users ADD COLUMN created_at {time_type} DEFAULT CURRENT_TIMESTAMP"))
        if "department_id" not in columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN department_id INTEGER"))

        if "created_at" in columns:
            try:
                connection.execute(text("UPDATE users SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL"))
            except Exception:
                pass

        logger.info("Users schema compatibility check completed")


def ensure_passes_schema(engine: Engine) -> None:
    inspector = inspect(engine)
    if "passes" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("passes")}
    is_sqlite = engine.dialect.name == "sqlite"

    with engine.begin() as connection:
        if "pass_type" not in columns:
            connection.execute(text("ALTER TABLE passes ADD COLUMN pass_type VARCHAR(20)"))
        if "allowed_zones" not in columns:
            connection.execute(text("ALTER TABLE passes ADD COLUMN allowed_zones JSON"))
        if "group_id" not in columns:
            connection.execute(text("ALTER TABLE passes ADD COLUMN group_id INTEGER"))
        if "created_by" not in columns:
            connection.execute(text("ALTER TABLE passes ADD COLUMN created_by INTEGER"))
        if "updated_at" not in columns:
            time_type = "DATETIME" if is_sqlite else "TIMESTAMP"
            connection.execute(text(f"ALTER TABLE passes ADD COLUMN updated_at {time_type}"))
        if "qr_code_data" not in columns:
            connection.execute(text("ALTER TABLE passes ADD COLUMN qr_code_data TEXT"))

        try:
            connection.execute(
                text(
                    """
                    UPDATE passes
                    SET zone = CASE zone
                        WHEN 'Zone 1' THEN 'zone_1'
                        WHEN 'Zone 2' THEN 'zone_2'
                        WHEN 'Zone 3' THEN 'zone_3'
                        WHEN 'Zone 4' THEN 'zone_4'
                        ELSE zone
                    END
                    WHERE zone IN ('Zone 1', 'Zone 2', 'Zone 3', 'Zone 4')
                    """
                )
            )
        except Exception:
            pass

        try:
            connection.execute(
                text(
                    """
                    UPDATE passes
                    SET pass_type = CASE
                        WHEN zone IN ('zone_1') THEN 'blue'
                        WHEN zone IN ('zone_2') THEN 'red'
                        WHEN zone IN ('zone_3') THEN 'orange'
                        WHEN zone IN ('zone_4') THEN 'green'
                        ELSE 'purple'
                    END
                    WHERE pass_type IS NULL OR pass_type = ''
                    """
                )
            )
        except Exception:
            pass

        try:
            connection.execute(
                text(
                    """
                    UPDATE passes
                    SET updated_at = COALESCE(updated_at, issued_time, CURRENT_TIMESTAMP)
                    WHERE updated_at IS NULL
                    """
                )
            )
        except Exception:
            pass

        logger.info("Passes schema compatibility check completed")


def ensure_visitor_requests_schema(engine: Engine) -> None:
    inspector = inspect(engine)
    if "visitor_requests" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("visitor_requests")}
    is_sqlite = engine.dialect.name == "sqlite"
    time_type = "DATETIME" if is_sqlite else "TIMESTAMP"
    bool_false = "DEFAULT 0" if is_sqlite else "DEFAULT FALSE"

    required_columns = [
        ("department_id", "INTEGER"),
        ("department_name", "VARCHAR(150)"),
        ("visitor_type", "VARCHAR(20) DEFAULT 'normal'"),
        ("vip_lmv_access", "VARCHAR(50)"),
        ("nic_verified", f"BOOLEAN {bool_false}"),
        ("pass_returned", f"BOOLEAN {bool_false}"),
        ("record_closed_by_id", "INTEGER"),
        ("record_closed_at", time_type),
        ("dept_manager_id", "INTEGER"),
        ("dept_reviewed_at", time_type),
        ("dept_comments", "TEXT"),
        ("vehicle_number", "VARCHAR(50)"),
        ("carrying_equipment", f"BOOLEAN {bool_false}"),
        ("equipment_description", "TEXT"),
        ("additional_notes", "TEXT"),
        ("supporting_docs_urls", "TEXT"),
        ("workflow_transitions", "TEXT"),
        ("visitor_category", "VARCHAR(100)"),
        ("visitors_json", "TEXT"),
        ("vehicles_json", "TEXT"),
        ("request_source", "VARCHAR(20) DEFAULT 'external'"),
    ]

    with engine.begin() as connection:
        for col_name, col_type in required_columns:
            if col_name not in columns:
                try:
                    connection.execute(text(f"ALTER TABLE visitor_requests ADD COLUMN {col_name} {col_type}"))
                except Exception as e:
                    logger.warning(f"Could not add column {col_name}: {e}")

    logger.info("Visitor requests schema compatibility check completed")