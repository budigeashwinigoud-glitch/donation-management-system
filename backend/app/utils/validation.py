from datetime import date
from decimal import Decimal, InvalidOperation
import re


EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
PHONE_PATTERN = re.compile(r"^[+()\-\s\d]{7,20}$")


def parse_date(value, field_name):
    if isinstance(value, date):
        return value
    if not isinstance(value, str):
        raise ValueError(f"{field_name} must be an ISO date (YYYY-MM-DD)")
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise ValueError(f"{field_name} must be an ISO date (YYYY-MM-DD)") from exc


def parse_amount(value):
    if isinstance(value, bool):
        raise ValueError("amount must be a positive number")
    try:
        amount = Decimal(str(value))
    except (InvalidOperation, ValueError):
        raise ValueError("amount must be a positive number") from None
    if not amount.is_finite() or amount <= 0 or amount.as_tuple().exponent < -2:
        raise ValueError("amount must be positive and have at most two decimal places")
    if amount >= Decimal("10000000000"):
        raise ValueError("amount exceeds the supported limit")
    return amount.quantize(Decimal("0.01"))


def validate_email(value):
    if value is not None and (not isinstance(value, str) or not EMAIL_PATTERN.fullmatch(value)):
        raise ValueError("email must be a valid email address")


def validate_phone(value):
    if value is not None and (not isinstance(value, str) or not PHONE_PATTERN.fullmatch(value)):
        raise ValueError("phone must contain 7 to 20 valid phone characters")