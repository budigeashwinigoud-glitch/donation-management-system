from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, Index

from app.extensions import db


class Donation(db.Model):
    __tablename__ = "donations"
    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_donations_amount_positive"),
        CheckConstraint("status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')", name="ck_donations_status"),
        Index("ix_donations_donor_id", "donor_id"),
        Index("ix_donations_campaign_id", "campaign_id"),
        Index("ix_donations_donation_date", "donation_date"),
        Index("ix_donations_status", "status"),
    )

    id = db.Column(db.Integer, primary_key=True)
    donor_id = db.Column(db.Integer, db.ForeignKey("donors.id"), nullable=False)
    campaign_id = db.Column(db.Integer, db.ForeignKey("campaigns.id"), nullable=False)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    donation_date = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    status = db.Column(db.String(20), nullable=False, default="PENDING")
    notes = db.Column(db.Text)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    donor = db.relationship("Donor", back_populates="donations")
    campaign = db.relationship("Campaign", back_populates="donations")
    creator = db.relationship("User", back_populates="donations")
    payment = db.relationship("Payment", back_populates="donation", uselist=False, cascade="all, delete-orphan")