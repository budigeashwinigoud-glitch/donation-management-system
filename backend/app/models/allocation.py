from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, Index

from app.extensions import db


class Allocation(db.Model):
    __tablename__ = "allocations"
    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_allocations_amount_positive"),
        Index("ix_allocations_campaign_id", "campaign_id"),
        Index("ix_allocations_beneficiary_id", "beneficiary_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey("campaigns.id"), nullable=False)
    beneficiary_id = db.Column(db.Integer, db.ForeignKey("beneficiaries.id"), nullable=False)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    allocation_date = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    purpose = db.Column(db.String(160), nullable=False)
    notes = db.Column(db.Text)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    campaign = db.relationship("Campaign", back_populates="allocations")
    beneficiary = db.relationship("Beneficiary", back_populates="allocations")
    creator = db.relationship("User", back_populates="allocations")