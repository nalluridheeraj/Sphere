from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app import models, schemas, database, dependencies
from app.routers.users import build_user_out

router = APIRouter(prefix="/posts", tags=["Posts"])


# ── Shared builder ────────────────────────────────────────────────────────────

def build_post_out(post: models.Post, db: Session, uid: int) -> schemas.PostOut:
    likes_count = db.query(models.Like).filter(models.Like.post_id == post.id).count()
    reposts_count = db.query(models.Repost).filter(models.Repost.post_id == post.id).count()
    comments_count = db.query(models.Comment).filter(
        models.Comment.post_id == post.id,
        models.Comment.parent_id == None,
    ).count()

    is_liked = db.query(models.Like).filter(
        models.Like.post_id == post.id, models.Like.user_id == uid
    ).first() is not None

    is_reposted = db.query(models.Repost).filter(
        models.Repost.post_id == post.id, models.Repost.user_id == uid
    ).first() is not None

    # Quoted post (slim view, no nested quotes)
    quote_of: Optional[schemas.PostSlim] = None
    if post.quote_of_id:
        qpost = db.query(models.Post).filter(models.Post.id == post.quote_of_id).first()
        if qpost:
            quote_of = schemas.PostSlim(
                id=qpost.id,
                content=qpost.content or "",
                media_url=qpost.media_url or "",
                media_type=qpost.media_type or "text",
                created_at=qpost.created_at,
                user_id=qpost.user_id,
                author=build_user_out(qpost.author, db, uid),
            )

    return schemas.PostOut(
        id=post.id,
        content=post.content or "",
        media_url=post.media_url or "",
        media_type=post.media_type or "text",
        created_at=post.created_at,
        user_id=post.user_id,
        author=build_user_out(post.author, db, uid),
        comments_count=comments_count,
        likes_count=likes_count,
        is_liked_by_me=is_liked,
        reposts_count=reposts_count,
        is_reposted_by_me=is_reposted,
        quote_of=quote_of,
    )


# ── Create ────────────────────────────────────────────────────────────────────

@router.post("", response_model=schemas.PostOut, status_code=status.HTTP_201_CREATED)
def create_post(
    post_in: schemas.PostCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    if not post_in.content.strip() and not (post_in.media_url or "").strip():
        raise HTTPException(status_code=400, detail="Post must have text or media.")

    new_post = models.Post(
        content=post_in.content,
        media_url=post_in.media_url or "",
        media_type=post_in.media_type or "text",
        user_id=current_user.id,
        quote_of_id=post_in.quote_of_id,
    )
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    return build_post_out(new_post, db, current_user.id)


# ── Feeds ─────────────────────────────────────────────────────────────────────

@router.get("", response_model=List[schemas.PostOut])
def get_feed(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    posts = (
        db.query(models.Post)
        .order_by(models.Post.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [build_post_out(p, db, current_user.id) for p in posts]


@router.get("/orbit-feed", response_model=List[schemas.PostOut])
def get_orbit_feed(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    """Posts from people in your orbit + your own posts."""
    ids = [f[0] for f in db.query(models.Follow.following_id).filter(
        models.Follow.follower_id == current_user.id
    ).all()]
    ids.append(current_user.id)

    posts = (
        db.query(models.Post)
        .filter(models.Post.user_id.in_(ids))
        .order_by(models.Post.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [build_post_out(p, db, current_user.id) for p in posts]


@router.get("/user/{username}", response_model=List[schemas.PostOut])
def get_user_posts(
    username: str,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    posts = (
        db.query(models.Post)
        .filter(models.Post.user_id == user.id)
        .order_by(models.Post.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [build_post_out(p, db, current_user.id) for p in posts]


# ── Single post ───────────────────────────────────────────────────────────────

@router.get("/{post_id}", response_model=schemas.PostOut)
def get_post(
    post_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")
    return build_post_out(post, db, current_user.id)


# ── Update / Delete ───────────────────────────────────────────────────────────

@router.put("/{post_id}", response_model=schemas.PostOut)
def update_post(
    post_id: int,
    post_in: schemas.PostUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")
    if post.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized.")
    post.content = post_in.content
    db.commit()
    db.refresh(post)
    return build_post_out(post, db, current_user.id)


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")
    if post.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized.")
    db.delete(post)
    db.commit()


# ── Like ──────────────────────────────────────────────────────────────────────

@router.post("/{post_id}/like")
def toggle_like(
    post_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    if not db.query(models.Post).filter(models.Post.id == post_id).first():
        raise HTTPException(status_code=404, detail="Post not found.")

    existing = db.query(models.Like).filter(
        models.Like.post_id == post_id, models.Like.user_id == current_user.id
    ).first()

    if existing:
        db.delete(existing)
        db.commit()
        return {"action": "unliked"}
    db.add(models.Like(user_id=current_user.id, post_id=post_id))
    db.commit()
    return {"action": "liked"}


# ── Repost ────────────────────────────────────────────────────────────────────

@router.post("/{post_id}/repost")
def toggle_repost(
    post_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")

    existing = db.query(models.Repost).filter(
        models.Repost.post_id == post_id, models.Repost.user_id == current_user.id
    ).first()

    if existing:
        db.delete(existing)
        db.commit()
        return {"action": "unreposted"}
    db.add(models.Repost(user_id=current_user.id, post_id=post_id))
    db.commit()
    return {"action": "reposted"}
