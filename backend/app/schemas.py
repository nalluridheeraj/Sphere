import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, ConfigDict


# ── Auth / Token ──────────────────────────────────────────────────────────────

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class LoginRequest(BaseModel):
    identifier: str   # username OR email
    password: str

class OTPRequest(BaseModel):
    email: EmailStr

class OTPVerify(BaseModel):
    email: EmailStr
    code: str

class PasswordReset(BaseModel):
    email: EmailStr
    code: str
    new_password: str


# ── User ──────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    display_name: Optional[str] = ""

class UserUpdate(BaseModel):
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    display_name: Optional[str] = None

class UserOut(BaseModel):
    id: int
    username: str
    email: str
    display_name: str
    bio: str
    avatar_url: str
    is_email_verified: bool
    created_at: datetime.datetime
    orbit_count: int = 0
    following_count: int = 0
    is_in_my_orbit: bool = False

    model_config = ConfigDict(from_attributes=True)


# ── Comment ───────────────────────────────────────────────────────────────────

class CommentCreate(BaseModel):
    content: str = ""
    media_url: Optional[str] = ""
    media_type: Optional[str] = "text"
    parent_id: Optional[int] = None
    quote_of_id: Optional[int] = None

class CommentSlim(BaseModel):
    id: int
    content: str
    media_url: str
    media_type: str
    created_at: datetime.datetime
    user_id: int
    author: UserOut

    model_config = ConfigDict(from_attributes=True)

class CommentOut(BaseModel):
    id: int
    content: str
    media_url: str
    media_type: str
    created_at: datetime.datetime
    post_id: int
    user_id: int
    parent_id: Optional[int] = None
    author: UserOut
    likes_count: int = 0
    is_liked_by_me: bool = False
    replies_count: int = 0
    replies: List['CommentOut'] = []
    quote_of: Optional[CommentSlim] = None

    model_config = ConfigDict(from_attributes=True)

CommentOut.model_rebuild()


# ── Post ──────────────────────────────────────────────────────────────────────

class PostCreate(BaseModel):
    content: str = ""
    media_url: Optional[str] = ""
    media_type: Optional[str] = "text"
    quote_of_id: Optional[int] = None

class PostUpdate(BaseModel):
    content: str

class PostSlim(BaseModel):
    id: int
    content: str
    media_url: str
    media_type: str
    created_at: datetime.datetime
    user_id: int
    author: UserOut

    model_config = ConfigDict(from_attributes=True)

class PostOut(BaseModel):
    id: int
    content: str
    media_url: str
    media_type: str
    created_at: datetime.datetime
    user_id: int
    author: UserOut
    comments_count: int = 0
    likes_count: int = 0
    is_liked_by_me: bool = False
    reposts_count: int = 0
    is_reposted_by_me: bool = False
    quote_of: Optional[PostSlim] = None

    model_config = ConfigDict(from_attributes=True)
