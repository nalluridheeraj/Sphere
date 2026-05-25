from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas, database, dependencies
from app.routers.users import build_user_out

router = APIRouter(prefix="/users", tags=["Orbit"])


@router.post("/{username}/join", status_code=status.HTTP_201_CREATED)
def join_orbit(
    username: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    """Follow (Join) a user's orbit."""
    target = db.query(models.User).filter(models.User.username == username).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")
    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot join your own orbit.")

    existing = db.query(models.Follow).filter(
        models.Follow.follower_id == current_user.id,
        models.Follow.following_id == target.id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already in this orbit.")

    db.add(models.Follow(follower_id=current_user.id, following_id=target.id))
    db.commit()
    return {"message": f"You joined @{username}'s orbit."}


@router.delete("/{username}/join", status_code=status.HTTP_200_OK)
def leave_orbit(
    username: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    """Unfollow (Leave) a user's orbit."""
    target = db.query(models.User).filter(models.User.username == username).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")

    follow = db.query(models.Follow).filter(
        models.Follow.follower_id == current_user.id,
        models.Follow.following_id == target.id,
    ).first()
    if not follow:
        raise HTTPException(status_code=400, detail="You are not in this orbit.")

    db.delete(follow)
    db.commit()
    return {"message": f"You left @{username}'s orbit."}


@router.get("/{username}/orbit", response_model=List[schemas.UserOut])
def get_orbit(
    username: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    """Get all users following this person (their orbit)."""
    target = db.query(models.User).filter(models.User.username == username).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")

    followers = (
        db.query(models.User)
        .join(models.Follow, models.Follow.follower_id == models.User.id)
        .filter(models.Follow.following_id == target.id)
        .all()
    )
    return [build_user_out(u, db, current_user.id) for u in followers]


@router.get("/{username}/following", response_model=List[schemas.UserOut])
def get_following(
    username: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    """Get all users this person is following."""
    target = db.query(models.User).filter(models.User.username == username).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")

    following = (
        db.query(models.User)
        .join(models.Follow, models.Follow.following_id == models.User.id)
        .filter(models.Follow.follower_id == target.id)
        .all()
    )
    return [build_user_out(u, db, current_user.id) for u in following]
