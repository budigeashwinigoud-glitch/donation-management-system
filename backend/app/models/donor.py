from datetime import datetime, timezone

from sqlalchemy import Index

from app.extensions import db


class Donor(db.Model):
    __tablename__ = "donors"
    __table_args__ = (
        Index("ix_donors_email", "email", unique=True),
        Index("ix_donors_phone", "phone", unique=True),
        Index("ix_donors_active", "is_active"),
    )

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), nullable=True)
    phone = db.Column(db.String(30), nullable=True)
    address = db.Column(db.String(255))
    city = db.Column(db.String(100))
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    donations = db.relationship("Donation", back_populates="donor")