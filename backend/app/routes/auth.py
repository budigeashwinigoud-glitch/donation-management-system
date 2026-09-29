from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token
from sqlalchemy.exc import SQLAlchemyError

from app.extensions import db
from app.models import User
from app.utils.audit import add_audit_log
from app.utils.errors import APIError
from app.utils.responses import error_response, success_response

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/auth/login")
def login():
    body = request.get_json(silent=True) or {}
    email = body.get("email")
    password = body.get("password")
    if not isinstance(email, str) or not isinstance(password, str) or not email or not password:
        return error_response("email and password are required", 400)

    try:
        user = User.query.filter_by(email=email.strip().lower()).first()
    except SQLAlchemyError:
        db.session.rollback()
        return error_response("Authentication service is temporarily unavailable", 503)
    try:
        valid_password = bool(user and user.is_active and user.verify_password(password))
    except (TypeError, ValueError):
        valid_password = False
    if not valid_password:
        return error_response("Invalid email or password", 401)

    try:
        add_audit_log(user.id, "USER", user.id, "LOGIN", "User logged in")
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return error_response("Unable to complete login", 500)

    token = create_access_token(
        identity=str(user.id), additional_claims={"role": user.role}
    )
    return jsonify(
        {
            "access_token": token,
            "user": {
                "id": user.id,
                "full_name": user.full_name,
                "email": user.email,
                "role": user.role,
            },
        }
    ), 200