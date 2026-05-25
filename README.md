# Sovereign Space — Mini Social Platform

A full-stack social media platform built with **React + Vite** (frontend) and **FastAPI + SQLite** (backend).

## Features

- User registration & JWT authentication
- Create, edit, delete posts (280 char limit)
- Like / unlike posts
- Comment on posts & delete your own comments
- User profiles with editable bio & avatar URL
- User search with debounced input
- Dark mode (persisted via localStorage)
- Responsive design with Tailwind CSS

## Tech Stack

| Layer     | Technology                              |
|-----------|-----------------------------------------|
| Frontend  | React 18, Vite, Tailwind CSS, Axios     |
| Backend   | FastAPI, SQLAlchemy, Pydantic v2        |
| Database  | SQLite (file: `social.db`)              |
| Auth      | JWT (python-jose), bcrypt (passlib)     |

---

## Local Development Setup

### 1. Backend (FastAPI)

```bash
cd backend

# Create & activate virtual environment
python -m venv venv
source venv/bin/activate        # macOS/Linux
# venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn app.main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

### 2. Frontend (React + Vite)

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

App available at: http://localhost:5173

---

## Project Structure

```
mini-social-platform/
│
├── backend/
│   ├── app/
│   │   ├── config.py          # Settings (env vars)
│   │   ├── database.py        # SQLAlchemy engine & session
│   │   ├── models.py          # User, Post, Comment, Like ORM models
│   │   ├── schemas.py         # Pydantic request/response schemas
│   │   ├── security.py        # Password hashing & JWT creation
│   │   ├── dependencies.py    # Auth dependency (get_current_user)
│   │   ├── main.py            # FastAPI app, CORS, router registration
│   │   └── routers/
│   │       ├── auth.py        # POST /auth/register, /auth/login
│   │       ├── users.py       # GET/PUT /users/me, GET /users/{username}
│   │       ├── posts.py       # CRUD /posts, /posts/user/{username}
│   │       ├── comments.py    # POST/DELETE /posts/{id}/comments
│   │       └── likes.py       # POST /posts/{id}/like (toggle)
│   ├── .env
│   └── requirements.txt
│
└── frontend/
    ├── src/
    │   ├── services/api.js        # Axios instance + API calls
    │   ├── context/AuthContext.jsx# Auth state & helpers
    │   ├── components/
    │   │   ├── Navbar.jsx         # Top nav, search, dark mode
    │   │   ├── PostCard.jsx       # Post display, like/comment actions
    │   │   ├── CommentSection.jsx # Comment list & form
    │   │   ├── CreatePostModal.jsx# Create/edit post modal
    │   │   └── Toast.jsx          # Notification toasts
    │   ├── pages/
    │   │   ├── Feed.jsx           # Main post feed
    │   │   ├── Profile.jsx        # User profile + their posts
    │   │   ├── Login.jsx          # Login form
    │   │   └── Register.jsx       # Registration form
    │   ├── App.jsx                # Routes & layout
    │   └── main.jsx               # React entry point
    ├── .env                       # VITE_API_URL
    ├── index.html
    ├── package.json
    ├── tailwind.config.js
    └── vite.config.js
```

## API Endpoints

| Method | Path                              | Auth | Description              |
|--------|-----------------------------------|------|--------------------------|
| POST   | /api/auth/register                | No   | Register new user        |
| POST   | /api/auth/login                   | No   | Login, returns JWT       |
| GET    | /api/users/me                     | Yes  | Get current user         |
| PUT    | /api/users/me                     | Yes  | Update bio/avatar        |
| GET    | /api/users/{username}             | Yes  | Get user profile         |
| GET    | /api/users/search?q=              | Yes  | Search users             |
| GET    | /api/posts                        | Yes  | Get feed (all posts)     |
| POST   | /api/posts                        | Yes  | Create post              |
| GET    | /api/posts/{id}                   | Yes  | Get single post          |
| PUT    | /api/posts/{id}                   | Yes  | Edit post (owner only)   |
| DELETE | /api/posts/{id}                   | Yes  | Delete post (owner only) |
| GET    | /api/posts/user/{username}        | Yes  | Get user's posts         |
| POST   | /api/posts/{id}/like              | Yes  | Toggle like              |
| POST   | /api/posts/{id}/comments          | Yes  | Add comment              |
| DELETE | /api/posts/{id}/comments/{cid}    | Yes  | Delete comment (owner)   |
