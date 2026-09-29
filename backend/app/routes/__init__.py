from app.routes.allocations import allocations_bp
from app.routes.auth import auth_bp
from app.routes.beneficiaries import beneficiaries_bp
from app.routes.campaigns import campaigns_bp
from app.routes.donations import donations_bp
from app.routes.donors import donors_bp
from app.routes.reports import reports_bp


def register_routes(app):
    for blueprint in (
        auth_bp,
        donors_bp,
        campaigns_bp,
        donations_bp,
        beneficiaries_bp,
        allocations_bp,
        reports_bp,
    ):
        app.register_blueprint(blueprint, url_prefix="/api")