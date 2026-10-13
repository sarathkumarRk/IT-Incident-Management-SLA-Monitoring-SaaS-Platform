import logging
import cloudinary
import cloudinary.uploader

from app.config import settings

logger = logging.getLogger(__name__)


def configure_cloudinary() -> None:
    """Configure Cloudinary using environment settings."""
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )


def upload_attachment(file, folder: str = "incident_attachments") -> dict:
    """
    Upload an incident attachment to Cloudinary.
    Returns the uploaded file details.
    Raises ValueError when the upload fails.
    """
    try:
        configure_cloudinary()

        result = cloudinary.uploader.upload(
            file,
            folder=folder,
            resource_type="auto",
        )

        return {
            "url": result.get("secure_url"),
            "public_id": result.get("public_id"),
            "format": result.get("format"),
            "resource_type": result.get("resource_type"),
        }

    except Exception as exc:
        logger.exception("Cloudinary attachment upload failed")
        raise ValueError("Unable to upload attachment.") from exc


def delete_attachment(public_id: str, resource_type: str = "image") -> bool:
    """Delete an attachment from Cloudinary."""
    if not public_id:
        return False

    try:
        configure_cloudinary()

        result = cloudinary.uploader.destroy(
            public_id,
            resource_type=resource_type,
        )

        return result.get("result") == "ok"

    except Exception:
        logger.exception("Cloudinary attachment deletion failed")
        return False
