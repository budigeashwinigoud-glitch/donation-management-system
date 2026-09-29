from functools import wraps

from flask_jwt_extended import get_jwt, jwt_required

from app.utils.responses import error_response


def roles_required(*roles):
    def decorator(view):
        @wraps(view)
        @jwt_required()
        def wrapped(*args, **kwargs):
            if get_jwt().get("role") not in roles:
                return error_response("You are not authorized to perform this action", 403)
            return view(*args, **kwargs)

        return wrapped

    return decorator