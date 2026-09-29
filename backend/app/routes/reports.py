from decimal import Decimal

from flask import Blueprint
from flask_jwt_extended import jwt_required
from sqlalchemy import func

from app.extensions import db
from app.models import Allocation, Campaign, Donation, Donor
from app.utils.responses import success_response

reports_bp = Blueprint("reports", __name__)


def money(value):
    return str(Decimal(value or 0).quantize(Decimal("0.01")))


@reports_bp.get("/reports/dashboard")
@jwt_required()
def dashboard():
    total_donors = db.session.query(func.count(Donor.id)).scalar() or 0
    active_campaigns = db.session.query(func.count(Campaign.id)).filter(
        Campaign.status == "ACTIVE"
    ).scalar() or 0
    completed_count = db.session.query(func.count(Donation.id)).filter(
        Donation.status == "COMPLETED"
    ).scalar() or 0
    collected = db.session.query(func.coalesce(func.sum(Donation.amount), 0)).filter(
        Donation.status == "COMPLETED"
    ).scalar()
    allocated = db.session.query(func.coalesce(func.sum(Allocation.amount), 0)).scalar()
    collected_value = Decimal(collected or 0)
    allocated_value = Decimal(allocated or 0)
    return success_response(
        {
            "total_donors": total_donors,
            "active_campaigns": active_campaigns,
            "total_completed_donations": completed_count,
            "total_collected_amount": money(collected_value),
            "total_allocated_amount": money(allocated_value),
            "available_amount": money(collected_value - allocated_value),
        }
    )


@reports_bp.get("/reports/campaigns")
@jwt_required()
def campaign_report():
    donation_totals = db.session.query(
        Donation.campaign_id.label("campaign_id"),
        func.sum(Donation.amount).label("collected"),
    ).filter(Donation.status == "COMPLETED").group_by(Donation.campaign_id).subquery()
    allocation_totals = db.session.query(
        Allocation.campaign_id.label("campaign_id"),
        func.sum(Allocation.amount).label("allocated"),
    ).group_by(Allocation.campaign_id).subquery()
    rows = db.session.query(
        Campaign,
        func.coalesce(donation_totals.c.collected, 0),
        func.coalesce(allocation_totals.c.allocated, 0),
    ).outerjoin(donation_totals, donation_totals.c.campaign_id == Campaign.id).outerjoin(
        allocation_totals, allocation_totals.c.campaign_id == Campaign.id
    ).order_by(Campaign.id).all()

    report = []
    for campaign, collected, allocated in rows:
        collected_value = Decimal(collected or 0)
        allocated_value = Decimal(allocated or 0)
        report.append(
            {
                "campaign_id": campaign.id,
                "campaign_name": campaign.name,
                "target_amount": money(campaign.target_amount),
                "collected_amount": money(collected_value),
                "allocated_amount": money(allocated_value),
                "available_amount": money(collected_value - allocated_value),
            }
        )
    return success_response(report)