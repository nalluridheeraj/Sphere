import os
import uuid
import io
import aiofiles
import boto3
from botocore.exceptions import ClientError
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from app import dependencies, models
from app.config import settings

router = APIRouter(prefix="/media", tags=["Media"])

ALLOWED_IMAGES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
ALLOWED_VIDEOS = {"video/mp4", "video/webm", "video/quicktime", "video/avi", "video/x-matroska"}
ALLOWED_AUDIO = {"audio/webm", "audio/ogg", "audio/mpeg", "audio/wav", "audio/mp4", "audio/x-m4a"}
ALLOWED_FILES = {"application/pdf", "application/zip", "text/plain",
                 "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                 "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                 "application/octet-stream"}
MAX_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024

EXT_MAP = {
    "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp",
    "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov",
    "video/avi": "avi", "video/x-matroska": "mkv",
    "audio/webm": "webm", "audio/ogg": "ogg", "audio/mpeg": "mp3",
    "audio/wav": "wav", "audio/mp4": "m4a", "audio/x-m4a": "m4a",
    "application/pdf": "pdf", "application/zip": "zip", "text/plain": "txt",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
}


def _get_s3_client():
    """Create an S3 client using credentials from .env"""
    return boto3.client(
        "s3",
        region_name=settings.AWS_S3_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )


def _upload_to_s3(content: bytes, filename: str, content_type: str) -> str:
    """Upload bytes to S3 and return the public URL."""
    s3 = _get_s3_client()
    key = f"media/{filename}"

    s3.put_object(
        Bucket=settings.AWS_S3_BUCKET,
        Key=key,
        Body=content,
        ContentType=content_type,
    )

    # Return the public URL
    return f"https://{settings.AWS_S3_BUCKET}.s3.{settings.AWS_S3_REGION}.amazonaws.com/{key}"


async def _upload_to_local(content: bytes, filename: str) -> str:
    """Save file locally and return the relative URL."""
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    async with aiofiles.open(filepath, "wb") as f:
        await f.write(content)
    return f"/uploads/{filename}"


@router.post("/upload")
async def upload_media(
    file: UploadFile = File(...),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    content_type = (file.content_type or "").lower()

    if content_type in ALLOWED_IMAGES:
        media_type = "image"
    elif content_type in ALLOWED_VIDEOS:
        media_type = "video"
    elif content_type in ALLOWED_AUDIO:
        media_type = "audio"
    elif content_type in ALLOWED_FILES:
        media_type = "file"
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{content_type}'.",
        )

    content = await file.read()
    if len(content) > MAX_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE_MB} MB.",
        )

    ext = EXT_MAP.get(content_type, "bin")
    filename = f"{uuid.uuid4().hex}.{ext}"

    # ── Upload to S3 or local ─────────────────────────────────────────────
    if settings.STORAGE_BACKEND == "s3":
        if not settings.AWS_S3_BUCKET or not settings.AWS_ACCESS_KEY_ID:
            raise HTTPException(
                status_code=500,
                detail="S3 storage is configured but AWS credentials are missing in .env",
            )
        try:
            url = _upload_to_s3(content, filename, content_type)
        except ClientError as e:
            raise HTTPException(status_code=500, detail=f"S3 upload failed: {str(e)}")
    else:
        url = await _upload_to_local(content, filename)

    return {"url": url, "media_type": media_type, "filename": filename}
