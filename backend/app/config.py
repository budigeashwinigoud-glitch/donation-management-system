import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
    CORS_ORIGINS = os.getenv(
        "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
    ).split(",")

    @classmethod
    def validate(cls):
        if not cls.SQLALCHEMY_DATABASE_URI:
            raise RuntimeError("DATABASE_URL must be configured in the environment")
        if not cls.SQLALCHEMY_DATABASE_URI.startswith("mysql+pymysql://"):
            raise RuntimeError("DATABASE_URL must use the mysql+pymysql driver")
        if not cls.JWT_SECRET_KEY:
            raise RuntimeError("JWT_SECRET_KEY must be configured in the environment")