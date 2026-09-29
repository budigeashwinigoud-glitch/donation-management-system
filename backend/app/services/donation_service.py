from datetime import datetime, timezone

from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.extensions import db
from app.models import Campaign, Donation, Donor, Payment
from app.utils.audit import add_audit_log
from app.utils.errors import APIError
from app.utils.validation import parse_amount

PAYMENT_METHODS = {"UPI", "CARD", "BANK_TRANSFER", "CASH", "OTHER"}
DONATION_STATUSES = {"PENDING", "COMPLETED", "FAILED", "REFUNDED"}


def create_donation(user_id, payload):
    if not isinstance(payload, dict):
        raise APIError("Request body must be a JSON object")
    try:
        donor_id = int(payload.get("donor_id"))
        campaign_id = int(payload.get("campaign_id"))
        amount = parse_amount(payload.get("amount"))
    except (TypeError, ValueError):
        raise APIError("donor_id, campaign_id, and a positive amount are required") from None

    method = payload.get("payment_method")
    if not isinstance(method, str) or method not in PAYMENT_METHODS:
        raise APIError("payment_method must be UPI, CARD, BANK_TRANSFER, CASH, or OTHER")
    reference = payload.get("transaction_reference")
    if reference is not None and (not isinstance(reference, str) or not reference.strip()):
        raise APIError("transaction_reference must be a non-empty string")
    notes = payload.get("notes")
    if notes is not None and not isinstance(notes, str):
        raise APIError("notes must be a string")

    try:
        donor = db.session.get(Donor, donor_id)
        if not donor:
            raise APIError("Donor not found", 404)
        if not donor.is_active:
            raise APIError("Inactive donors cannot make donations", 400)
        campaign = db.session.execute(
            db.select(Campaign).where(Campaign.id == campaign_id).with_for_update()
        ).scalar_one_or_none()
        if not campaign:
            raise APIError("Campaign not found", 404)
        today = datetime.now(timezone.utc).date()
        if campaign.end_date < campaign.start_date:
            raise APIError("Campaign has invalid dates", 400)
        if campaign.status != "ACTIVE":
            raise APIError("Campaign is not accepting donations", 400)
        if not campaign.start_date <= today <= campaign.end_date:
            raise APIError("Campaign is outside its donation dates", 400)

        donation = Donation(
            donor_id=donor.id,
            campaign_id=campaign.id,
            amount=amount,
            status="PENDING",
            notes=notes.strip() if notes else None,
            created_by=user_id,
        )
        db.session.add(donation)
        db.session.flush()
        payment = Payment(
            donation_id=donation.id,
            payment_method=method,
            transaction_reference=reference.strip() if reference else None,
            status="PENDING",
        )
        db.session.add(payment)
        add_audit_log(user_id, "DONATION", donation.id, "CREATE", "Donation and payment recorded")
        db.session.commit()
        return donation
    except APIError:
        db.session.rollback()
        raise
    except IntegrityError as exc:
        db.session.rollback()
        if "transaction_reference" in str(exc.orig).lower():
            raise APIError("transaction_reference is already in use", 409) from None
        raise APIError("Donation violates a database constraint", 409) from None
    except SQLAlchemyError:
        db.session.rollback()
        raise APIError("Unable to create donation", 500) from None


def update_donation_status(user_id, donation_id, status):
    if not isinstance(status, str) or status not in DONATION_STATUSES:
        raise APIError("status must be PENDING, COMPLETED, FAILED, or REFUNDED")
    try:
        donation = db.session.execute(
            db.select(Donation).where(Donation.id == donation_id).with_for_update()
        ).scalar_one_or_none()
        if not donation:
            raise APIError("Donation not found", 404)
        payment = db.session.execute(
            db.select(Payment).where(Payment.donation_id == donation_id).with_for_update()
        ).scalar_one_or_none()
        if not payment:
            raise APIError("Payment record not found", 409)
        previous_status = donation.status
        donation.status = status
        payment.status = status
        payment.payment_date = datetime.now(timezone.utc)
        add_audit_log(
            user_id,
            "PAYMENT",
            payment.id,
            "STATUS_CHANGE",
            f"Donation/payment status changed from {previous_status} to {status}",
        )
        db.session.commit()
        return donation
    except APIError:
        db.session.rollback()
        raise
    except SQLAlchemyError:
        db.session.rollback()
        raise APIError("Unable to update payment status", 500) from None