from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, Index

from app.extensions import db


class Campaign(db.Model):
    __tablename__ = "campaigns"
    __table_args__ = (
        CheckConstraint("target_amount > 0", name="ck_campaigns_target_positive"),
        CheckConstraint("status IN ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED')", name="ck_campaigns_status"),
        CheckConstraint("end_date >= start_date", name="ck_campaigns_date_order"),
        Index("ix_campaigns_status", "status"),
    )

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(160), nullable=False)
    description = db.Column(db.Text)
    target_amount = db.Column(db.Numeric(12, 2), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(20), nullable=False, default="DRAFT")
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    donations = db.relationship("Donation", back_populates="campaign")
    allocations = db.relationship("Allocation", back_populates="campaign")
    beneficiaries = db.relationship(
        "Beneficiary",
        secondary="allocations",
        back_populates="campaigns",
        viewonly=True,
    )