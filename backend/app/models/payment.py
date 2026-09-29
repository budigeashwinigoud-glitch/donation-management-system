from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, Index

from app.extensions import db


class Payment(db.Model):
    __tablename__ = "payments"
    __table_args__ = (
        CheckConstraint("payment_method IN ('UPI', 'CARD', 'BANK_TRANSFER', 'CASH', 'OTHER')", name="ck_payments_method"),
        CheckConstraint("status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')", name="ck_payments_status"),
        Index("ix_payments_status", "status"),
    )

    id = db.Column(db.Integer, primary_key=True)
    donation_id = db.Column(db.Integer, db.ForeignKey("donations.id"), nullable=False, unique=True)
    payment_method = db.Column(db.String(30), nullable=False)
    transaction_reference = db.Column(db.String(160), nullable=True, unique=True)
    payment_date = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    status = db.Column(db.String(20), nullable=False, default="PENDING")
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    donation = db.relationship("Donation", back_populates="payment")