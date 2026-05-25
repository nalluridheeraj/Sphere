import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./sphere.db"
    JWT_SECRET_KEY: str = "sphere_super_secret_key_9e87f273b4d5e2a101f3b7c9d8e7f6a5b4c3d2e1f0a9"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Email / SMTP — leave blank to use console output (dev mode)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""

    # AWS S3 — set STORAGE_BACKEND=s3 to use cloud storage
    STORAGE_BACKEND: str = "local"  # "local" or "s3"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_S3_BUCKET: str = ""
    AWS_S3_REGION: str = "ap-south-1"  # Mumbai (closest to India)

    # Application
    FRONTEND_URL: str = "http://localhost:5173"
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 50

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
