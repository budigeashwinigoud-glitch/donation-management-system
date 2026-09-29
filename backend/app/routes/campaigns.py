from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.extensions import db
from app.models import Campaign
from app.utils.audit import add_audit_log
from app.utils.errors import APIError
from app.utils.responses import error_response, success_response
from app.utils.security import roles_required
from app.utils.validation import parse_amount, parse_date

campaigns_bp = Blueprint("campaigns", __name__)
CAMPAIGN_STATUSES = {"DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"}


def serialize_campaign(campaign):
    return {
        "id": campaign.id,
        "name": campaign.name,
        "description": campaign.description,
        "target_amount": str(campaign.target_amount),
        "start_date": campaign.start_date.isoformat(),
        "end_date": campaign.end_date.isoformat(),
        "status": campaign.status,
        "created_at": campaign.created_at.isoformat(),
        "updated_at": campaign.updated_at.isoformat(),
    }


def apply_campaign_fields(campaign, body, partial):
    if not isinstance(body, dict):
        raise APIError("Request body must be a JSON object")
    required = ("name", "target_amount", "start_date", "end_date")
    if not partial:
        missing = [field for field in required if field not in body]
        if missing:
            raise APIError(f"Missing required fields: {', '.join(missing)}")
    try:
        for field in ("name", "description", "target_amount", "start_date", "end_date", "status"):
            if field not in body:
                continue
            value = body[field]
            if field == "name":
                if not isinstance(value, str) or not value.strip():
                    raise APIError("name is required")
                campaign.name = value.strip()
            elif field == "description":
                if value is not None and not isinstance(value, str):
                    raise APIError("description must be a string")
                campaign.description = value
            elif field == "target_amount":
                campaign.target_amount = parse_amount(value)
            elif field in ("start_date", "end_date"):
                setattr(campaign, field, parse_date(value, field))
            elif field == "status":
                if not isinstance(value, str) or value not in CAMPAIGN_STATUSES:
                    raise APIError("status must be DRAFT, ACTIVE, COMPLETED, or CANCELLED")
                campaign.status = value
    except ValueError as exc:
        raise APIError(str(exc)) from exc
    if campaign.start_date and campaign.end_date and campaign.end_date < campaign.start_date:
        raise APIError("end_date cannot be before start_date")


@campaigns_bp.get("/campaigns")
@roles_required("ADMIN", "STAFF")
def list_campaigns():
    return success_response([serialize_campaign(c) for c in Campaign.query.order_by(Campaign.id.desc()).all()])


@campaigns_bp.post("/campaigns")
@roles_required("ADMIN", "STAFF")
def create_campaign():
    campaign = Campaign()
    try:
        apply_campaign_fields(campaign, request.get_json(silent=True), partial=False)
        db.session.add(campaign)
        db.session.flush()
        add_audit_log(int(get_jwt_identity()), "CAMPAIGN", campaign.id, "CREATE", "Campaign created")
        db.session.commit()
        return success_response(serialize_campaign(campaign), 201)
    except APIError as exc:
        db.session.rollback()
        return error_response(exc.message, exc.status)
    except IntegrityError:
        db.session.rollback()
        return error_response("Campaign data violates a database constraint", 400)
    except SQLAlchemyError:
        db.session.rollback()
        return error_response("Unable to create campaign", 500)


@campaigns_bp.get("/campaigns/<int:campaign_id>")
@roles_required("ADMIN", "STAFF")
def get_campaign(campaign_id):
    campaign = db.session.get(Campaign, campaign_id)
    if not campaign:
        return error_response("Campaign not found", 404)
    return success_response(serialize_campaign(campaign))


def update_campaign(campaign_id, partial):
    campaign = db.session.get(Campaign, campaign_id)
    if not campaign:
        return error_response("Campaign not found", 404)
    try:
        apply_campaign_fields(campaign, request.get_json(silent=True), partial)
        db.session.flush()
        add_audit_log(int(get_jwt_identity()), "CAMPAIGN", campaign.id, "UPDATE", "Campaign updated")
        db.session.commit()
        return success_response(serialize_campaign(campaign))
    except APIError as exc:
        db.session.rollback()
        return error_response(exc.message, exc.status)
    except IntegrityError:
        db.session.rollback()
        return error_response("Campaign data violates a database constraint", 400)
    except SQLAlchemyError:
        db.session.rollback()
        return error_response("Unable to update campaign", 500)


@campaigns_bp.put("/campaigns/<int:campaign_id>")
@roles_required("ADMIN", "STAFF")
def replace_campaign(campaign_id):
    return update_campaign(campaign_id, partial=False)


@campaigns_bp.patch("/campaigns/<int:campaign_id>")
@roles_required("ADMIN", "STAFF")
def patch_campaign(campaign_id):
    return update_campaign(campaign_id, partial=True)