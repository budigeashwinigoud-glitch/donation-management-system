from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, Index

from app.extensions import db


class Beneficiary(db.Model):
    __tablename__ = "beneficiaries"
    __table_args__ = (
        CheckConstraint("category IN ('EDUCATION', 'MEDICAL', 'FOOD', 'EMERGENCY', 'OTHER')", name="ck_beneficiaries_category"),
        CheckConstraint("status IN ('ACTIVE', 'INACTIVE')", name="ck_beneficiaries_status"),
        Index("ix_beneficiaries_status", "status"),
    )

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(30))
    address = db.Column(db.String(255))
    city = db.Column(db.String(100))
    category = db.Column(db.String(20), nullable=False)
    status = db.Column(db.String(20), nullable=False, default="ACTIVE")
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    allocations = db.relationship("Allocation", back_populates="beneficiary")
    campaigns = db.relationship(
        "Campaign",
        secondary="allocations",
        back_populates="beneficiaries",
        viewonly=True,
    )