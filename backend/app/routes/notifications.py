import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import (
    NotificationResponse,
    NotificationReadUpdate,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)


# 1. Get logged-in user's notifications
@router.get("/", response_model=list[NotificationResponse])
def get_notifications(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    unread_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Notification).filter(
        Notification.user_id == current_user.id
    )

    if unread_only:
        query = query.filter(Notification.is_read.is_(False))

    try:
        return (
            query.order_by(
                Notification.created_at.desc(),
                Notification.id.desc(),
            )
            .offset((page - 1) * limit)
            .limit(limit)
            .all()
        )
    except SQLAlchemyError as exc:
        logger.exception("Failed to retrieve notifications")
        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve notifications",
        ) from exc


# 2. Get unread notification count
@router.get("/unread-count")
def get_unread_notification_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        unread_count = (
            db.query(func.count(Notification.id))
            .filter(
                Notification.user_id == current_user.id,
                Notification.is_read.is_(False),
            )
            .scalar()
            or 0
        )

        return {"unread_count": unread_count}

    except SQLAlchemyError as exc:
        logger.exception("Failed to retrieve unread notification count")
        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve unread notification count",
        ) from exc


# 3. Mark a notification as read or unread
@router.patch(
    "/{notification_id}/read",
    response_model=NotificationResponse,
)
def update_notification_read_status(
    notification_id: int,
    read_data: NotificationReadUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
        .first()
    )

    if not notification:
        raise HTTPException(
            status_code=404,
            detail="Notification not found",
        )

    notification.is_read = read_data.is_read

    try:
        db.commit()
        db.refresh(notification)
        return notification

    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Failed to update notification read status")
        raise HTTPException(
            status_code=500,
            detail="Unable to update notification",
        ) from exc


# 4. Mark all logged-in user's notifications as read
@router.patch("/read-all")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        updated_count = (
            db.query(Notification)
            .filter(
                Notification.user_id == current_user.id,
                Notification.is_read.is_(False),
            )
            .update(
                {Notification.is_read: True},
                synchronize_session=False,
            )
        )

        db.commit()

        return {
            "message": "All notifications marked as read",
            "updated_count": updated_count,
        }

    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Failed to mark notifications as read")
        raise HTTPException(
            status_code=500,
            detail="Unable to update notifications",
        ) from exc
