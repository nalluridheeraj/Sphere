import json
import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func, case
from pydantic import BaseModel
from typing import Optional
from app import models, database, dependencies

router = APIRouter(prefix="/messages", tags=["Messages"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class SendMessageBody(BaseModel):
    content: str = ""
    media_url: str = ""
    media_type: str = "text"
    file_name: str = ""
    shared_post_id: Optional[int] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _serialize_user(u):
    return {
        "id": u.id, "username": u.username,
        "display_name": u.display_name or u.username,
        "avatar_url": u.avatar_url or "",
    }


def _serialize_message(m):
    result = {
        "id": m.id, "conversation_id": m.conversation_id,
        "sender": _serialize_user(m.sender),
        "content": m.content, "media_url": m.media_url,
        "media_type": m.media_type, "file_name": m.file_name,
        "shared_post_id": m.shared_post_id,
        "is_read": m.is_read,
        "created_at": m.created_at.isoformat(),
    }
    if m.shared_post and m.shared_post_id:
        p = m.shared_post
        result["shared_post"] = {
            "id": p.id, "content": p.content[:200],
            "media_url": p.media_url, "media_type": p.media_type,
            "author": _serialize_user(p.author),
        }
    return result


def _get_other_user(conv, current_user_id):
    return conv.user1 if conv.user2_id == current_user_id else conv.user2


def _are_in_orbit(db, uid1, uid2):
    """Check if either user follows the other."""
    return db.query(models.Follow).filter(
        or_(
            and_(models.Follow.follower_id == uid1, models.Follow.following_id == uid2),
            and_(models.Follow.follower_id == uid2, models.Follow.following_id == uid1),
        )
    ).first() is not None


def _get_or_create_conv(db, current_user, target_user):
    u1 = min(current_user.id, target_user.id)
    u2 = max(current_user.id, target_user.id)
    conv = db.query(models.Conversation).filter(
        models.Conversation.user1_id == u1,
        models.Conversation.user2_id == u2,
    ).first()
    if not conv:
        is_orbit = _are_in_orbit(db, current_user.id, target_user.id)
        conv = models.Conversation(
            user1_id=u1, user2_id=u2, is_accepted=is_orbit,
        )
        db.add(conv)
        db.commit()
        db.refresh(conv)
    return conv


# ── Chat WebSocket Manager ────────────────────────────────────────────────────

class ChatManager:
    def __init__(self):
        self.connections = {}   # username -> WebSocket

    async def connect(self, username, ws):
        self.connections[username] = ws

    def disconnect(self, username):
        self.connections.pop(username, None)

    async def send_to_user(self, username, payload):
        ws = self.connections.get(username)
        if ws:
            try:
                await ws.send_text(json.dumps(payload))
            except Exception:
                self.disconnect(username)


chat_manager = ChatManager()


# ── REST Endpoints ────────────────────────────────────────────────────────────

@router.get("/conversations/unread-count")
def get_unread_count(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    count = db.query(func.count(models.Message.id)).join(
        models.Conversation
    ).filter(
        or_(
            models.Conversation.user1_id == current_user.id,
            models.Conversation.user2_id == current_user.id,
        ),
        models.Conversation.is_accepted == True,
        models.Message.sender_id != current_user.id,
        models.Message.is_read == False,
    ).scalar()
    return {"unread_count": count or 0}


@router.get("/conversations")
def list_conversations(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    convs = db.query(models.Conversation).filter(
        or_(
            models.Conversation.user1_id == current_user.id,
            models.Conversation.user2_id == current_user.id,
        )
    ).order_by(models.Conversation.last_message_at.desc()).all()

    results = []
    for c in convs:
        other = _get_other_user(c, current_user.id)
        last_msg = db.query(models.Message).filter(
            models.Message.conversation_id == c.id
        ).order_by(models.Message.created_at.desc()).first()

        unread = db.query(func.count(models.Message.id)).filter(
            models.Message.conversation_id == c.id,
            models.Message.sender_id != current_user.id,
            models.Message.is_read == False,
        ).scalar()

        # Determine if current user is the requester or recipient
        is_requester = False
        if not c.is_accepted and last_msg:
            is_requester = last_msg.sender_id == current_user.id

        results.append({
            "id": c.id,
            "other_user": _serialize_user(other),
            "is_accepted": c.is_accepted,
            "is_requester": is_requester,
            "unread_count": unread or 0,
            "last_message": _serialize_message(last_msg) if last_msg else None,
            "last_message_at": c.last_message_at.isoformat(),
            "created_at": c.created_at.isoformat(),
        })

    return results


@router.get("/{username}")
def get_conversation(
    username: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    target = db.query(models.User).filter(models.User.username == username).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")
    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot message yourself.")

    conv = _get_or_create_conv(db, current_user, target)

    total = db.query(func.count(models.Message.id)).filter(
        models.Message.conversation_id == conv.id
    ).scalar()

    msgs = db.query(models.Message).filter(
        models.Message.conversation_id == conv.id
    ).order_by(models.Message.created_at.desc()).offset(skip).limit(limit).all()

    return {
        "conversation": {
            "id": conv.id,
            "is_accepted": conv.is_accepted,
            "other_user": _serialize_user(target),
        },
        "messages": [_serialize_message(m) for m in reversed(msgs)],
        "total": total,
    }


@router.post("/{username}")
async def send_message(
    username: str,
    body: SendMessageBody,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    target = db.query(models.User).filter(models.User.username == username).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")
    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot message yourself.")

    conv = _get_or_create_conv(db, current_user, target)

    # If not accepted and messages already exist from the requester, block further messages
    if not conv.is_accepted:
        existing = db.query(models.Message).filter(
            models.Message.conversation_id == conv.id
        ).count()
        if existing > 0:
            # Only the original sender can have sent messages; block more until accepted
            first_msg = db.query(models.Message).filter(
                models.Message.conversation_id == conv.id
            ).order_by(models.Message.created_at.asc()).first()
            if first_msg and first_msg.sender_id == current_user.id:
                raise HTTPException(
                    status_code=403,
                    detail="Message request pending. Wait for the user to accept.",
                )

    msg = models.Message(
        conversation_id=conv.id,
        sender_id=current_user.id,
        content=body.content,
        media_url=body.media_url,
        media_type=body.media_type,
        file_name=body.file_name,
        shared_post_id=body.shared_post_id,
    )
    db.add(msg)
    conv.last_message_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(msg)

    serialized = _serialize_message(msg)

    # Real-time push to recipient
    await chat_manager.send_to_user(target.username, {
        "type": "new-message",
        "message": serialized,
        "conversation_id": conv.id,
        "is_accepted": conv.is_accepted,
    })

    return serialized


@router.put("/{conversation_id}/read")
def mark_read(
    conversation_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    conv = db.query(models.Conversation).filter(
        models.Conversation.id == conversation_id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    if current_user.id not in (conv.user1_id, conv.user2_id):
        raise HTTPException(status_code=403, detail="Not your conversation.")

    db.query(models.Message).filter(
        models.Message.conversation_id == conversation_id,
        models.Message.sender_id != current_user.id,
        models.Message.is_read == False,
    ).update({"is_read": True})
    db.commit()
    return {"ok": True}


@router.post("/requests/{conversation_id}/accept")
def accept_request(
    conversation_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    conv = db.query(models.Conversation).filter(
        models.Conversation.id == conversation_id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    if current_user.id not in (conv.user1_id, conv.user2_id):
        raise HTTPException(status_code=403, detail="Not your conversation.")

    conv.is_accepted = True
    db.commit()
    return {"ok": True, "is_accepted": True}


@router.post("/requests/{conversation_id}/decline")
def decline_request(
    conversation_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    conv = db.query(models.Conversation).filter(
        models.Conversation.id == conversation_id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    if current_user.id not in (conv.user1_id, conv.user2_id):
        raise HTTPException(status_code=403, detail="Not your conversation.")

    db.delete(conv)
    db.commit()
    return {"ok": True}
