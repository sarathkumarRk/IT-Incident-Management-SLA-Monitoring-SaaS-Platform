from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.security import verify_access_token


security = HTTPBearer()


# Get Current User
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    token = credentials.credentials

    payload = verify_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user_id = payload.get("sub")

    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    user = db.query(User).filter(User.id == user_id).first()

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    return user


# Admin Only
def admin_required(
    user: User = Depends(get_current_user),
):
    if user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    return user


# Support Agent Only
def support_agent_required(
    user: User = Depends(get_current_user),
):
    if user.role != "SUPPORT_AGENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Support Agent access required",
        )

    return user


# Reporter Only
def reporter_required(
    user: User = Depends(get_current_user),
):
    if user.role != "REPORTER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Reporter access required",
        )

    return user


# Manager Only
def manager_required(
    user: User = Depends(get_current_user),
):
    if user.role != "MANAGER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manager access required",
        )

    return user
