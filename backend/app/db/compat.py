import logging

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)


def ensure_users_schema(engine: Engine) -> None:
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("users")}

    with engine.begin() as connection:
        if "is_active" not in columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1"))
        if "created_at" not in columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP"))

        if "created_at" in columns:
            connection.execute(text("UPDATE users SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL"))

        logger.info("Users schema compatibility check completed")


def ensure_passes_schema(engine: Engine) -> None:
    inspector = inspect(engine)
    if "passes" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("passes")}

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
            connection.execute(text("ALTER TABLE passes ADD COLUMN updated_at DATETIME"))

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

        connection.execute(
            text(
                """
                UPDATE passes
                SET allowed_zones = CASE pass_type
                    WHEN 'blue' THEN '[1]'
                    WHEN 'red' THEN '[2]'
                    WHEN 'orange' THEN '[3]'
                    WHEN 'green' THEN '[4]'
                    ELSE '[1,2,3,4]'
                END
                WHERE allowed_zones IS NULL OR allowed_zones = ''
                """
            )
        )

        connection.execute(
            text(
                """
                UPDATE passes
                SET updated_at = COALESCE(updated_at, issued_time, CURRENT_TIMESTAMP)
                WHERE updated_at IS NULL
                """
            )
        )

        logger.info("Passes schema compatibility check completed")