from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.database import get_db
from app.models.user import User
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    UserResponse,
    TokenResponse,
)
from app.security import (
    hash_password,
    verify_password,
    create_access_token,
)
from app.dependencies import get_current_user


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


# Register - First Admin Only
@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_admin(
    data: RegisterRequest,
    db: Session = Depends(get_db),
):
    # Check whether an Admin already exists
    admin_exists = (
        db.query(User)
        .filter(User.role == "ADMIN")
        .first()
    )

    if admin_exists:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin already exists. Registration is closed.",
        )

    name = data.name.strip()
    email = str(data.email).strip().lower()

    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name cannot be empty.",
        )

    # Check whether the email already exists
    existing_user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered.",
        )

    # Role is always assigned by the backend
    admin = User(
        name=name,
        email=email,
        hashed_password=hash_password(data.password),
        role="ADMIN",
        is_active=True,
    )

    try:
        db.add(admin)
        db.commit()
        db.refresh(admin)

        return admin

    except SQLAlchemyError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to register Admin account.",
        )


# Login - All Roles
@router.post(
    "/login",
    response_model=TokenResponse,
)
def login_user(
    data: LoginRequest,
    db: Session = Depends(get_db),
):
    email = str(data.email).strip().lower()

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if not user or not verify_password(
        data.password,
        user.hashed_password,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive.",
        )

    access_token = create_access_token(
        {
            "sub": str(user.id),
            "role": user.role,
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


# Get Current Logged-in User
@router.get(
    "/me",
    response_model=UserResponse,
)
def get_current_user_details(
    current_user: User = Depends(get_current_user),
):
    return current_user
