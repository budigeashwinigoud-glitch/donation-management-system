from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.extensions import db
from app.models import Allocation, Beneficiary, Campaign, Donation
from app.utils.audit import add_audit_log
from app.utils.errors import APIError
from app.utils.validation import parse_amount


def create_allocation(user_id, payload):
    if not isinstance(payload, dict):
        raise APIError("Request body must be a JSON object")
    try:
        campaign_id = int(payload.get("campaign_id"))
        beneficiary_id = int(payload.get("beneficiary_id"))
        amount = parse_amount(payload.get("amount"))
    except (TypeError, ValueError):
        raise APIError("campaign_id, beneficiary_id, and a positive amount are required") from None
    purpose = payload.get("purpose")
    notes = payload.get("notes")
    if not isinstance(purpose, str) or not purpose.strip():
        raise APIError("purpose is required")
    if notes is not None and not isinstance(notes, str):
        raise APIError("notes must be a string")

    try:
        campaign = db.session.execute(
            db.select(Campaign).where(Campaign.id == campaign_id).with_for_update()
        ).scalar_one_or_none()
        if not campaign:
            raise APIError("Campaign not found", 404)
        beneficiary = db.session.get(Beneficiary, beneficiary_id)
        if not beneficiary:
            raise APIError("Beneficiary not found", 404)
        if beneficiary.status != "ACTIVE":
            raise APIError("Inactive beneficiaries cannot receive allocations", 400)

        collected = db.session.query(
            func.coalesce(func.sum(Donation.amount), 0)
        ).filter(
            Donation.campaign_id == campaign_id,
            Donation.status == "COMPLETED",
        ).scalar()
        allocated = db.session.query(
            func.coalesce(func.sum(Allocation.amount), 0)
        ).filter(Allocation.campaign_id == campaign_id).scalar()
        available = Decimal(collected or 0) - Decimal(allocated or 0)
        if amount > available:
            raise APIError("Allocation exceeds available campaign funds", 409)

        allocation = Allocation(
            campaign_id=campaign_id,
            beneficiary_id=beneficiary_id,
            amount=amount,
            purpose=purpose.strip(),
            notes=notes.strip() if notes else None,
            created_by=user_id,
        )
        db.session.add(allocation)
        db.session.flush()
        add_audit_log(user_id, "ALLOCATION", allocation.id, "CREATE", "Allocation created")
        db.session.commit()
        return allocation
    except APIError:
        db.session.rollback()
        raise
    except IntegrityError:
        db.session.rollback()
        raise APIError("Allocation violates a database constraint", 409) from None
    except SQLAlchemyError:
        db.session.rollback()
        raise APIError("Unable to create allocation", 500) from None