
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.team import Team
from app.schemas.team import TeamCreate, TeamResponse, TeamUpdate
from app.dependencies import admin_required

router = APIRouter(
    prefix="/teams",
    tags=["Teams"],
)


# Admin only: Create a team
@router.post(
    "/",
    response_model=TeamResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_team(
    team_data: TeamCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_required),
):
    existing_team = (
        db.query(Team)
        .filter(Team.name == team_data.name)
        .first()
    )

    if existing_team:
        raise HTTPException(
            status_code=400,
            detail="Team name already exists",
        )

    new_team = Team(
        name=team_data.name,
        description=team_data.description,
    )

    try:
        db.add(new_team)
        db.commit()
        db.refresh(new_team)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to create team",
        )

    return new_team


# Logged-in users: View teams
@router.get("/", response_model=list[TeamResponse])
def get_teams(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),
):
    return db.query(Team).order_by(Team.id.desc()).all()


# Admin only: View one team
@router.get("/{team_id}", response_model=TeamResponse)
def get_team(
    team_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_required),
):
    team = db.query(Team).filter(Team.id == team_id).first()

    if not team:
        raise HTTPException(
            status_code=404,
            detail="Team not found",
        )

    return team


# Admin only: Update team
@router.patch("/{team_id}", response_model=TeamResponse)
def update_team(
    team_id: int,
    team_data: TeamUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_required),
):
    team = db.query(Team).filter(Team.id == team_id).first()

    if not team:
        raise HTTPException(
            status_code=404,
            detail="Team not found",
        )

    update_data = team_data.model_dump(exclude_unset=True)

    if "name" in update_data:
        existing_team = (
            db.query(Team)
            .filter(
                Team.name == update_data["name"],
                Team.id != team_id,
            )
            .first()
        )

        if existing_team:
            raise HTTPException(
                status_code=400,
                detail="Team name already exists",
            )

    for key, value in update_data.items():
        setattr(team, key, value)

    try:
        db.commit()
        db.refresh(team)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to update team",
        )

    return team


# Admin only: Delete team
@router.delete("/{team_id}")
def delete_team(
    team_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_required),
):
    team = db.query(Team).filter(Team.id == team_id).first()

    if not team:
        raise HTTPException(
            status_code=404,
            detail="Team not found",
        )

    if team.incidents:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete a team that has incidents",
        )

    try:
        db.delete(team)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to delete team",
        )

    return {"message": "Team deleted successfully"}
