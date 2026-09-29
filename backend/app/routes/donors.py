from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.extensions import db
from app.models import Donor
from app.utils.audit import add_audit_log
from app.utils.errors import APIError
from app.utils.responses import error_response, success_response
from app.utils.security import roles_required
from app.utils.validation import validate_email, validate_phone

donors_bp = Blueprint("donors", __name__)
DONOR_FIELDS = ("full_name", "email", "phone", "address", "city")


def serialize_donor(donor):
    return {
        "id": donor.id,
        "full_name": donor.full_name,
        "email": donor.email,
        "phone": donor.phone,
        "address": donor.address,
        "city": donor.city,
        "is_active": donor.is_active,
        "created_at": donor.created_at.isoformat(),
        "updated_at": donor.updated_at.isoformat(),
    }


def apply_donor_fields(donor, body, partial):
    if not isinstance(body, dict):
        raise APIError("Request body must be a JSON object")
    if not partial and not isinstance(body.get("full_name"), str):
        raise APIError("full_name is required")
    for field in DONOR_FIELDS:
        if field not in body:
            continue
        value = body[field]
        if field == "full_name":
            if not isinstance(value, str) or not value.strip():
                raise APIError("full_name is required")
            donor.full_name = value.strip()
        elif field in ("email", "phone"):
            if isinstance(value, str):
                value = value.strip()
            if value == "":
                value = None
            if field == "email" and value:
                value = value.lower()
            (validate_email if field == "email" else validate_phone)(value)
            if value is not None and db.session.query(Donor.id).filter(
                getattr(Donor, field) == value,
                Donor.id != donor.id if donor.id else True,
            ).first():
                raise APIError(f"A donor with this {field} already exists", 409)
            setattr(donor, field, value)
        else:
            if value is not None and not isinstance(value, str):
                raise APIError(f"{field} must be a string")
            setattr(donor, field, value.strip() if value else value)


@donors_bp.get("/donors")
@roles_required("ADMIN", "STAFF")
def list_donors():
    query = Donor.query
    active = request.args.get("active")
    if active in ("true", "false"):
        query = query.filter_by(is_active=active == "true")
    donors = query.order_by(Donor.id.desc()).all()
    return success_response([serialize_donor(donor) for donor in donors])


@donors_bp.post("/donors")
@roles_required("ADMIN", "STAFF")
def create_donor():
    donor = Donor()
    try:
        apply_donor_fields(donor, request.get_json(silent=True), partial=False)
        db.session.add(donor)
        db.session.flush()
        add_audit_log(int(get_jwt_identity()), "DONOR", donor.id, "CREATE", "Donor created")
        db.session.commit()
        return success_response(serialize_donor(donor), 201)
    except APIError as exc:
        db.session.rollback()
        return error_response(exc.message, exc.status)
    except IntegrityError:
        db.session.rollback()
        return error_response("Email or phone is already in use", 409)
    except SQLAlchemyError:
        db.session.rollback()
        return error_response("Unable to create donor", 500)


@donors_bp.get("/donors/<int:donor_id>")
@roles_required("ADMIN", "STAFF")
def get_donor(donor_id):
    donor = db.session.get(Donor, donor_id)
    if not donor:
        return error_response("Donor not found", 404)
    return success_response(serialize_donor(donor))


def update_donor(donor_id, partial):
    donor = db.session.get(Donor, donor_id)
    if not donor:
        return error_response("Donor not found", 404)
    body = request.get_json(silent=True)
    try:
        apply_donor_fields(donor, body, partial)
        if "is_active" in (body or {}):
            if not isinstance(body["is_active"], bool):
                raise APIError("is_active must be a boolean")
            donor.is_active = body["is_active"]
        db.session.flush()
        add_audit_log(int(get_jwt_identity()), "DONOR", donor.id, "UPDATE", "Donor updated")
        db.session.commit()
        return success_response(serialize_donor(donor))
    except APIError as exc:
        db.session.rollback()
        return error_response(exc.message, exc.status)
    except IntegrityError:
        db.session.rollback()
        return error_response("Email or phone is already in use", 409)
    except SQLAlchemyError:
        db.session.rollback()
        return error_response("Unable to update donor", 500)


@donors_bp.put("/donors/<int:donor_id>")
@roles_required("ADMIN", "STAFF")
def replace_donor(donor_id):
    return update_donor(donor_id, partial=False)


@donors_bp.patch("/donors/<int:donor_id>")
@roles_required("ADMIN", "STAFF")
def patch_donor(donor_id):
    return update_donor(donor_id, partial=True)


@donors_bp.delete("/donors/<int:donor_id>")
@roles_required("ADMIN", "STAFF")
def deactivate_donor(donor_id):
    donor = db.session.get(Donor, donor_id)
    if not donor:
        return error_response("Donor not found", 404)
    try:
        donor.is_active = False
        add_audit_log(int(get_jwt_identity()), "DONOR", donor.id, "DEACTIVATE", "Donor deactivated")
        db.session.commit()
        return success_response(serialize_donor(donor), message="Donor deactivated")
    except SQLAlchemyError:
        db.session.rollback()
        return error_response("Unable to deactivate donor", 500)