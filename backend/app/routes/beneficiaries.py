from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.extensions import db
from app.models import Beneficiary
from app.utils.audit import add_audit_log
from app.utils.errors import APIError
from app.utils.responses import error_response, success_response
from app.utils.security import roles_required

beneficiaries_bp = Blueprint("beneficiaries", __name__)
CATEGORIES = {"EDUCATION", "MEDICAL", "FOOD", "EMERGENCY", "OTHER"}
STATUSES = {"ACTIVE", "INACTIVE"}
FIELDS = ("full_name", "phone", "address", "city", "category", "status")


def serialize_beneficiary(item):
    return {
        "id": item.id,
        "full_name": item.full_name,
        "phone": item.phone,
        "address": item.address,
        "city": item.city,
        "category": item.category,
        "status": item.status,
        "created_at": item.created_at.isoformat(),
        "updated_at": item.updated_at.isoformat(),
    }


def apply_fields(item, body, partial):
    if not isinstance(body, dict):
        raise APIError("Request body must be a JSON object")
    required = ("full_name", "category")
    if not partial and any(not body.get(field) for field in required):
        raise APIError("full_name and category are required")
    for field in FIELDS:
        if field not in body:
            continue
        value = body[field]
        if field == "full_name":
            if not isinstance(value, str) or not value.strip():
                raise APIError("full_name is required")
            item.full_name = value.strip()
        elif field == "category":
            if not isinstance(value, str) or value not in CATEGORIES:
                raise APIError("category must be EDUCATION, MEDICAL, FOOD, EMERGENCY, or OTHER")
            item.category = value
        elif field == "status":
            if not isinstance(value, str) or value not in STATUSES:
                raise APIError("status must be ACTIVE or INACTIVE")
            item.status = value
        elif value is not None and not isinstance(value, str):
            raise APIError(f"{field} must be a string")
        else:
            setattr(item, field, value.strip() if value else value)


@beneficiaries_bp.get("/beneficiaries")
@roles_required("ADMIN", "STAFF")
def list_beneficiaries():
    return success_response([serialize_beneficiary(x) for x in Beneficiary.query.order_by(Beneficiary.id.desc()).all()])


@beneficiaries_bp.post("/beneficiaries")
@roles_required("ADMIN", "STAFF")
def create_beneficiary():
    item = Beneficiary()
    try:
        apply_fields(item, request.get_json(silent=True), partial=False)
        db.session.add(item)
        db.session.flush()
        add_audit_log(int(get_jwt_identity()), "BENEFICIARY", item.id, "CREATE", "Beneficiary created")
        db.session.commit()
        return success_response(serialize_beneficiary(item), 201)
    except APIError as exc:
        db.session.rollback()
        return error_response(exc.message, exc.status)
    except IntegrityError:
        db.session.rollback()
        return error_response("Beneficiary data violates a database constraint", 400)
    except SQLAlchemyError:
        db.session.rollback()
        return error_response("Unable to create beneficiary", 500)


@beneficiaries_bp.get("/beneficiaries/<int:beneficiary_id>")
@roles_required("ADMIN", "STAFF")
def get_beneficiary(beneficiary_id):
    item = db.session.get(Beneficiary, beneficiary_id)
    if not item:
        return error_response("Beneficiary not found", 404)
    return success_response(serialize_beneficiary(item))


def update_beneficiary(beneficiary_id, partial):
    item = db.session.get(Beneficiary, beneficiary_id)
    if not item:
        return error_response("Beneficiary not found", 404)
    try:
        apply_fields(item, request.get_json(silent=True), partial)
        db.session.flush()
        add_audit_log(int(get_jwt_identity()), "BENEFICIARY", item.id, "UPDATE", "Beneficiary updated")
        db.session.commit()
        return success_response(serialize_beneficiary(item))
    except APIError as exc:
        db.session.rollback()
        return error_response(exc.message, exc.status)
    except IntegrityError:
        db.session.rollback()
        return error_response("Beneficiary data violates a database constraint", 400)
    except SQLAlchemyError:
        db.session.rollback()
        return error_response("Unable to update beneficiary", 500)


@beneficiaries_bp.put("/beneficiaries/<int:beneficiary_id>")
@roles_required("ADMIN", "STAFF")
def replace_beneficiary(beneficiary_id):
    return update_beneficiary(beneficiary_id, partial=False)


@beneficiaries_bp.patch("/beneficiaries/<int:beneficiary_id>")
@roles_required("ADMIN", "STAFF")
def patch_beneficiary(beneficiary_id):
    return update_beneficiary(beneficiary_id, partial=True)