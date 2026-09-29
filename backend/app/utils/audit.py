from app.extensions import db
from app.models import AuditLog


def add_audit_log(user_id, entity_type, entity_id, action, description=None):
    db.session.add(
        AuditLog(
            user_id=user_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            description=description,
        )
    )