from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app import models, schemas, database, dependencies
from app.routers.users import build_user_out

router = APIRouter(prefix="/posts/{post_id}/comments", tags=["Comments"])


# ── Builder ───────────────────────────────────────────────────────────────────

def build_comment_out(
    c: models.Comment,
    db: Session,
    uid: int,
    include_replies: bool = True,
) -> schemas.CommentOut:
    likes_count = db.query(models.CommentLike).filter(models.CommentLike.comment_id == c.id).count()
    is_liked = db.query(models.CommentLike).filter(
        models.CommentLike.comment_id == c.id,
        models.CommentLike.user_id == uid,
    ).first() is not None
    replies_count = db.query(models.Comment).filter(models.Comment.parent_id == c.id).count()

    replies: List[schemas.CommentOut] = []
    if include_replies:
        raw = (
            db.query(models.Comment)
            .filter(models.Comment.parent_id == c.id)
            .order_by(models.Comment.created_at.asc())
            .all()
        )
        # One level of nesting only (replies of replies shown inline)
        replies = [build_comment_out(r, db, uid, include_replies=False) for r in raw]

    quote_of: Optional[schemas.CommentSlim] = None
    if c.quote_of_id:
        q = db.query(models.Comment).filter(models.Comment.id == c.quote_of_id).first()
        if q:
            quote_of = schemas.CommentSlim(
                id=q.id,
                content=q.content or "",
                media_url=q.media_url or "",
                media_type=q.media_type or "text",
                created_at=q.created_at,
                user_id=q.user_id,
                author=build_user_out(q.author, db, uid),
            )

    return schemas.CommentOut(
        id=c.id,
        content=c.content or "",
        media_url=c.media_url or "",
        media_type=c.media_type or "text",
        created_at=c.created_at,
        post_id=c.post_id,
        user_id=c.user_id,
        parent_id=c.parent_id,
        author=build_user_out(c.author, db, uid),
        likes_count=likes_count,
        is_liked_by_me=is_liked,
        replies_count=replies_count,
        replies=replies,
        quote_of=quote_of,
    )


# ── GET comments ──────────────────────────────────────────────────────────────

@router.get("", response_model=List[schemas.CommentOut])
def get_comments(
    post_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")

    top_level = (
        db.query(models.Comment)
        .filter(models.Comment.post_id == post_id, models.Comment.parent_id == None)
        .order_by(models.Comment.created_at.asc())
        .all()
    )
    return [build_comment_out(c, db, current_user.id) for c in top_level]


# ── POST comment / reply ──────────────────────────────────────────────────────

@router.post("", response_model=schemas.CommentOut, status_code=status.HTTP_201_CREATED)
def create_comment(
    post_id: int,
    comment_in: schemas.CommentCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    if not db.query(models.Post).filter(models.Post.id == post_id).first():
        raise HTTPException(status_code=404, detail="Post not found.")

    if not (comment_in.content or "").strip() and not (comment_in.media_url or "").strip():
        raise HTTPException(status_code=400, detail="Comment must have text or media.")

    # Validate parent comment
    if comment_in.parent_id:
        parent = db.query(models.Comment).filter(models.Comment.id == comment_in.parent_id).first()
        if not parent or parent.post_id != post_id:
            raise HTTPException(status_code=400, detail="Parent comment not found on this post.")

    new_c = models.Comment(
        content=comment_in.content or "",
        media_url=comment_in.media_url or "",
        media_type=comment_in.media_type or "text",
        user_id=current_user.id,
        post_id=post_id,
        parent_id=comment_in.parent_id,
        quote_of_id=comment_in.quote_of_id,
    )
    db.add(new_c)
    db.commit()
    db.refresh(new_c)
    return build_comment_out(new_c, db, current_user.id)


# ── DELETE comment ────────────────────────────────────────────────────────────

@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(
    post_id: int,
    comment_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    comment = db.query(models.Comment).filter(
        models.Comment.id == comment_id,
        models.Comment.post_id == post_id,
    ).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found.")

    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    is_post_author = post and post.user_id == current_user.id
    is_comment_author = comment.user_id == current_user.id

    if not is_post_author and not is_comment_author:
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment.")

    db.delete(comment)
    db.commit()


# ── Like comment ──────────────────────────────────────────────────────────────

@router.post("/{comment_id}/like")
def toggle_comment_like(
    post_id: int,
    comment_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    comment = db.query(models.Comment).filter(
        models.Comment.id == comment_id,
        models.Comment.post_id == post_id,
    ).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found.")

    existing = db.query(models.CommentLike).filter(
        models.CommentLike.comment_id == comment_id,
        models.CommentLike.user_id == current_user.id,
    ).first()

    if existing:
        db.delete(existing)
        db.commit()
        return {"action": "unliked"}
    db.add(models.CommentLike(user_id=current_user.id, comment_id=comment_id))
    db.commit()
    return {"action": "liked"}
