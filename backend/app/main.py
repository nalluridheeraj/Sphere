import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import Base, engine
from app.routers import auth, users, posts, comments, follows, media, calls, messages
from app.config import settings

# ── Database ──────────────────────────────────────────────────────────────────
Base.metadata.create_all(bind=engine)

# ── Upload directory ──────────────────────────────────────────────────────────
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Sphere API",
    description="Sphere — the next-generation social platform.",
    version="2.0.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static Uploads ────────────────────────────────────────────────────────────
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router,     prefix="/api")
app.include_router(users.router,    prefix="/api")
app.include_router(posts.router,    prefix="/api")
app.include_router(comments.router, prefix="/api")
app.include_router(follows.router,  prefix="/api")
app.include_router(media.router,    prefix="/api")
app.include_router(calls.router,    prefix="/api")   # REST: /api/calls/initiate
app.include_router(calls.router)                      # WebSocket: /ws/call, /ws/chat, /ws/notify
app.include_router(messages.router,  prefix="/api")

from fastapi.responses import FileResponse

@app.get("/api/health")
def health_check():
    return {"status": "online", "service": "Sphere API", "version": "2.0.0"}

FRONTEND_DIST = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend", "dist")

@app.get("/{full_path:path}")
def serve_frontend(full_path: str):
    path = os.path.join(FRONTEND_DIST, full_path)
    if os.path.exists(path) and os.path.isfile(path):
        return FileResponse(path)
    # SPA fallback
    index_path = os.path.join(FRONTEND_DIST, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"error": "Frontend not built. Please run npm run build in frontend directory."}
