from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity
from sqlalchemy.exc import SQLAlchemyError

from app.extensions import db
from app.models import Donation
from app.services.donation_service import create_donation, update_donation_status
from app.utils.errors import APIError
from app.utils.responses import error_response, success_response
from app.utils.security import roles_required

donations_bp = Blueprint("donations", __name__)


def serialize_donation(item):
    return {
        "id": item.id,
        "donor_id": item.donor_id,
        "campaign_id": item.campaign_id,
        "amount": str(item.amount),
        "donation_date": item.donation_date.isoformat(),
        "status": item.status,
        "notes": item.notes,
        "created_by": item.created_by,
        "payment": {
            "id": item.payment.id,
            "payment_method": item.payment.payment_method,
            "transaction_reference": item.payment.transaction_reference,
            "payment_date": item.payment.payment_date.isoformat(),
            "status": item.payment.status,
        } if item.payment else None,
    }


@donations_bp.get("/donations")
@roles_required("ADMIN", "STAFF")
def list_donations():
    status = request.args.get("status")
    query = Donation.query
    if status:
        query = query.filter_by(status=status.upper())
    return success_response([serialize_donation(x) for x in query.order_by(Donation.id.desc()).all()])


@donations_bp.post("/donations")
@roles_required("ADMIN", "STAFF")
def post_donation():
    try:
        donation = create_donation(int(get_jwt_identity()), request.get_json(silent=True))
        return success_response(serialize_donation(donation), 201)
    except APIError as exc:
        return error_response(exc.message, exc.status)


@donations_bp.patch("/donations/<int:donation_id>/status")
@roles_required("ADMIN")
def patch_donation_status(donation_id):
    body = request.get_json(silent=True) or {}
    try:
        donation = update_donation_status(
            int(get_jwt_identity()), donation_id, body.get("status")
        )
        return success_response(serialize_donation(donation))
    except APIError as exc:
        return error_response(exc.message, exc.status)
    except SQLAlchemyError:
        db.session.rollback()
        return error_response("Unable to update donation status", 500)