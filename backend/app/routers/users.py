from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas, database, dependencies

router = APIRouter(prefix="/users", tags=["Users"])


# ── Shared builder ────────────────────────────────────────────────────────────

def build_user_out(
    user: models.User,
    db: Session,
    current_user_id: int | None = None,
) -> schemas.UserOut:
    orbit_count = db.query(models.Follow).filter(models.Follow.following_id == user.id).count()
    following_count = db.query(models.Follow).filter(models.Follow.follower_id == user.id).count()
    is_in_my_orbit = False
    if current_user_id:
        is_in_my_orbit = (
            db.query(models.Follow)
            .filter(
                models.Follow.follower_id == current_user_id,
                models.Follow.following_id == user.id,
            )
            .first()
        ) is not None

    return schemas.UserOut(
        id=user.id,
        username=user.username,
        email=user.email,
        display_name=user.display_name or user.username,
        bio=user.bio or "",
        avatar_url=user.avatar_url or "",
        is_email_verified=user.is_email_verified,
        created_at=user.created_at,
        orbit_count=orbit_count,
        following_count=following_count,
        is_in_my_orbit=is_in_my_orbit,
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/me", response_model=schemas.UserOut)
def get_me(
    current_user: models.User = Depends(dependencies.get_current_user),
    db: Session = Depends(database.get_db),
):
    return build_user_out(current_user, db, current_user.id)


@router.put("/me", response_model=schemas.UserOut)
def update_profile(
    data: schemas.UserUpdate,
    current_user: models.User = Depends(dependencies.get_current_user),
    db: Session = Depends(database.get_db),
):
    if data.bio is not None:
        current_user.bio = data.bio
    if data.avatar_url is not None:
        current_user.avatar_url = data.avatar_url
    if data.display_name is not None:
        current_user.display_name = data.display_name
    db.commit()
    db.refresh(current_user)
    return build_user_out(current_user, db, current_user.id)


@router.get("/search", response_model=List[schemas.UserOut])
def search_users(
    q: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    if len(q.strip()) < 2:
        return []
    users = (
        db.query(models.User)
        .filter(
            (models.User.username.ilike(f"%{q}%"))
            | (models.User.display_name.ilike(f"%{q}%"))
        )
        .limit(12)
        .all()
    )
    return [build_user_out(u, db, current_user.id) for u in users]


@router.get("/{username}", response_model=schemas.UserOut)
def get_user_profile(
    username: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return build_user_out(user, db, current_user.id)
