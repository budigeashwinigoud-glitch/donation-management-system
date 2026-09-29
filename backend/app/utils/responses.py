from flask import jsonify


def success_response(data=None, status=200, message=None):
    payload = {"status": "success"}
    if message:
        payload["message"] = message
    if data is not None:
        payload["data"] = data
    return jsonify(payload), status


def error_response(message, status):
    return jsonify({"status": "error", "message": message}), status