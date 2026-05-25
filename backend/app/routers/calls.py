import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict
from app import models, database, dependencies

router = APIRouter(tags=["Calls"])


# ── Signaling Manager ─────────────────────────────────────────────────────────

class SignalingManager:
    """Maintains WebSocket connections per call room for WebRTC signaling relay."""

    def __init__(self):
        self.rooms: Dict[str, Dict[str, WebSocket]] = {}
        self.user_sockets: Dict[str, WebSocket] = {}  # for call notifications

    async def connect_room(self, room_id: str, username: str, ws: WebSocket):
        await ws.accept()
        if room_id not in self.rooms:
            self.rooms[room_id] = {}
        self.rooms[room_id][username] = ws

    def disconnect_room(self, room_id: str, username: str):
        if room_id in self.rooms:
            self.rooms[room_id].pop(username, None)
            if not self.rooms[room_id]:
                del self.rooms[room_id]

    async def relay(self, room_id: str, message: str, sender: str):
        """Relay a signaling message to all other participants in the room."""
        for uname, ws in (self.rooms.get(room_id) or {}).items():
            if uname != sender:
                try:
                    await ws.send_text(message)
                except Exception:
                    pass

    async def connect_notification(self, username: str, ws: WebSocket):
        await ws.accept()
        self.user_sockets[username] = ws

    def disconnect_notification(self, username: str):
        self.user_sockets.pop(username, None)

    async def notify_user(self, username: str, payload: dict):
        ws = self.user_sockets.get(username)
        if ws:
            try:
                await ws.send_text(json.dumps(payload))
            except Exception:
                pass


manager = SignalingManager()


# ── REST: Initiate Call ───────────────────────────────────────────────────────

@router.post("/calls/initiate")
async def initiate_call(
    target_username: str,
    call_type: str = "video",
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    target = db.query(models.User).filter(models.User.username == target_username).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")

    # Verify orbit connection (either direction)
    connected = db.query(models.Follow).filter(
        (
            (models.Follow.follower_id == current_user.id)
            & (models.Follow.following_id == target.id)
        )
        | (
            (models.Follow.follower_id == target.id)
            & (models.Follow.following_id == current_user.id)
        )
    ).first()

    if not connected:
        raise HTTPException(
            status_code=403,
            detail="You can only call users who are in your orbit.",
        )

    room_id = f"call_{min(current_user.id, target.id)}_{max(current_user.id, target.id)}"

    # Notify the target user about the incoming call
    await manager.notify_user(target_username, {
        "type": "incoming-call",
        "caller": current_user.username,
        "caller_display_name": current_user.display_name or current_user.username,
        "caller_avatar": current_user.avatar_url,
        "call_type": call_type,
        "room_id": room_id,
    })

    return {
        "room_id": room_id,
        "caller": current_user.username,
        "target": target_username,
        "call_type": call_type,
    }


# ── WebSocket: Per-user Notifications (incoming call alerts) ─────────────────

@router.websocket("/ws/notify/{username}")
async def user_notify_ws(username: str, websocket: WebSocket, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        await websocket.close(code=4001)
        return

    await manager.connect_notification(username, websocket)
    try:
        while True:
            await websocket.receive_text()   # keep alive
    except WebSocketDisconnect:
        manager.disconnect_notification(username)


# ── WebSocket: Call Signaling Room ────────────────────────────────────────────

@router.websocket("/ws/call/{room_id}")
async def call_signal_ws(room_id: str, websocket: WebSocket, username: str, db: Session = Depends(database.get_db)):
    """
    WebRTC signaling relay endpoint.
    Clients exchange { type, data } messages (offer / answer / ice-candidate / user-joined / user-left).
    """
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        await websocket.close(code=4001)
        return

    await manager.connect_room(room_id, username, websocket)

    # Notify existing participants that a new user has joined
    await manager.relay(room_id, json.dumps({"type": "user-joined", "username": username}), username)

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
                msg["from"] = username          # stamp sender
                await manager.relay(room_id, json.dumps(msg), username)
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        manager.disconnect_room(room_id, username)
        await manager.relay(room_id, json.dumps({"type": "user-left", "username": username}), username)


# ── WebSocket: Chat (Real-time DM delivery) ──────────────────────────────────

@router.websocket("/ws/chat/{username}")
async def chat_ws(username: str, websocket: WebSocket, db: Session = Depends(database.get_db)):
    from app.routers.messages import chat_manager

    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        await websocket.close(code=4001)
        return

    await websocket.accept()
    await chat_manager.connect(username, websocket)
    try:
        while True:
            await websocket.receive_text()   # keep alive
    except WebSocketDisconnect:
        chat_manager.disconnect(username)
