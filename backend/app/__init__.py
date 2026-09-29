from flask import Flask
from flask_cors import CORS
import click
from sqlalchemy.exc import SQLAlchemyError

from app.config import Config
from app.extensions import db, jwt
from app.models import User
from app.utils.responses import error_response


def create_app(config_object=Config):
    app = Flask(__name__)
    app.config.from_object(config_object)
    config_object.validate()

    db.init_app(app)
    jwt.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})

    from app import models  # noqa: F401
    from app.routes import register_routes

    register_routes(app)

    @app.get("/api/health")
    def health():
        return {
            "status": "success",
            "message": "Donation Management API is running",
        }, 200

    @app.errorhandler(400)
    def bad_request(_error):
        return error_response("Bad request", 400)

    @app.errorhandler(404)
    def not_found(_error):
        return error_response("Resource not found", 404)

    @app.errorhandler(405)
    def method_not_allowed(_error):
        return error_response("Method not allowed", 405)

    @app.errorhandler(500)
    def internal_error(_error):
        db.session.rollback()
        return error_response("An unexpected server error occurred", 500)

    @jwt.unauthorized_loader
    def missing_token(_reason):
        return error_response("Authorization token is required", 401)

    @jwt.invalid_token_loader
    def invalid_token(_reason):
        return error_response("Authorization token is invalid", 401)

    @jwt.expired_token_loader
    def expired_token(_header, _payload):
        return error_response("Authorization token has expired", 401)

    @jwt.token_verification_loader
    def active_user_token(_header, payload):
        try:
            user_id = int(payload["sub"])
        except (KeyError, TypeError, ValueError):
            return False
        user = db.session.get(User, user_id)
        return bool(user and user.is_active)

    @jwt.token_verification_failed_loader
    def inactive_user_token(_header, _payload):
        return error_response("User is inactive or no longer exists", 401)

    @app.cli.command("init-db")
    def init_db_command():
        """Create database tables after DATABASE_URL points to an existing MySQL database."""
        db.create_all()
        print("Database tables created.")

    @app.cli.command("create-admin")
    @click.option("--name", prompt="Full name")
    @click.option("--email", prompt="Email")
    @click.password_option()
    def create_admin_command(name, email, password):
        """Create an administrator without exposing a password in shell history."""
        normalized_email = email.strip().lower()
        if not name.strip() or "@" not in normalized_email:
            raise click.ClickException("A name and valid email address are required.")
        if User.query.filter_by(email=normalized_email).first():
            raise click.ClickException("A user with that email already exists.")
        user = User(
            full_name=name.strip(),
            email=normalized_email,
            password_hash=User.hash_password(password),
            role="ADMIN",
        )
        db.session.add(user)
        db.session.commit()
        click.echo(f"Administrator {normalized_email} created.")

    @app.cli.command("reset-password")
    @click.option("--email", required=True, help="Email address of the existing account.")
    @click.password_option(confirmation_prompt=True)
    def reset_password_command(email, password):
        """Reset an account password without displaying or storing it in shell history."""
        password_bytes = password.encode("utf-8")
        if len(password_bytes) < 12:
            raise click.ClickException("Use a password with at least 12 characters.")
        if len(password_bytes) > 72:
            raise click.ClickException("Password must be no more than 72 UTF-8 bytes.")

        normalized_email = email.strip().lower()
        user = User.query.filter_by(email=normalized_email).first()
        if not user:
            raise click.ClickException("No account was found for that email address.")

        try:
            user.password_hash = User.hash_password(password)
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            raise click.ClickException("Could not update the password. Check the database connection.") from None
        click.echo("Password updated. The account email was not changed.")

    return app