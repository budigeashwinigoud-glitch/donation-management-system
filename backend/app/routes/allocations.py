from flask import Blueprint
from flask import request
from flask_jwt_extended import get_jwt_identity

from app.extensions import db
from app.models import Allocation
from app.services.allocation_service import create_allocation
from app.utils.errors import APIError
from app.utils.responses import error_response, success_response
from app.utils.security import roles_required

allocations_bp = Blueprint("allocations", __name__)


def serialize_allocation(item):
    return {
        "id": item.id,
        "campaign_id": item.campaign_id,
        "beneficiary_id": item.beneficiary_id,
        "amount": str(item.amount),
        "allocation_date": item.allocation_date.isoformat(),
        "purpose": item.purpose,
        "notes": item.notes,
        "created_by": item.created_by,
    }


@allocations_bp.get("/allocations")
@roles_required("ADMIN", "STAFF")
def list_allocations():
    return success_response([serialize_allocation(x) for x in Allocation.query.order_by(Allocation.id.desc()).all()])


@allocations_bp.post("/allocations")
@roles_required("ADMIN", "STAFF")
def post_allocation():
    try:
        item = create_allocation(int(get_jwt_identity()), request.get_json(silent=True))
        return success_response(serialize_allocation(item), 201)
    except APIError as exc:
        return error_response(exc.message, exc.status)


@allocations_bp.get("/allocations/<int:allocation_id>")
@roles_required("ADMIN", "STAFF")
def get_allocation(allocation_id):
    item = db.session.get(Allocation, allocation_id)
    if not item:
        return error_response("Allocation not found", 404)
    return success_response(serialize_allocation(item))