import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database import Base


# ── Association / Junction Tables ─────────────────────────────────────────────

class Follow(Base):
    """Tracks who follows whom — the 'Orbit' relationship."""
    __tablename__ = "follows"
    follower_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    following_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Like(Base):
    __tablename__ = "likes"
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class CommentLike(Base):
    __tablename__ = "comment_likes"
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    comment_id = Column(Integer, ForeignKey("comments.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Repost(Base):
    __tablename__ = "reposts"
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


# ── OTP ───────────────────────────────────────────────────────────────────────

class OTPCode(Base):
    __tablename__ = "otp_codes"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, nullable=False, index=True)
    code = Column(String, nullable=False)
    purpose = Column(String, nullable=False)   # "register" | "reset"
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


# ── Core Models ───────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    display_name = Column(String, default="")
    hashed_password = Column(String, nullable=False)
    bio = Column(Text, default="")
    avatar_url = Column(String, default="")
    is_email_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    posts = relationship(
        "Post",
        foreign_keys="[Post.user_id]",
        back_populates="author",
        cascade="all, delete-orphan"
    )
    comments = relationship(
        "Comment",
        foreign_keys="[Comment.user_id]",
        back_populates="author",
        cascade="all, delete-orphan"
    )


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, default="")
    media_url = Column(String, default="")
    media_type = Column(String, default="text")   # text | image | video
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    quote_of_id = Column(Integer, ForeignKey("posts.id", ondelete="SET NULL"), nullable=True)

    author = relationship("User", foreign_keys=[user_id], back_populates="posts")
    comments = relationship(
        "Comment",
        foreign_keys="[Comment.post_id]",
        back_populates="post",
        cascade="all, delete-orphan",
        order_by="Comment.created_at.asc()"
    )


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, default="")
    media_url = Column(String, default="")
    media_type = Column(String, default="text")   # text | image | video
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    parent_id = Column(Integer, ForeignKey("comments.id", ondelete="CASCADE"), nullable=True)
    quote_of_id = Column(Integer, ForeignKey("comments.id", ondelete="SET NULL"), nullable=True)

    author = relationship("User", foreign_keys=[user_id], back_populates="comments")
    post = relationship("Post", foreign_keys=[post_id], back_populates="comments")


# ── Direct Messaging ─────────────────────────────────────────────────────────

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    user1_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    user2_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    is_accepted = Column(Boolean, default=False)
    last_message_at = Column(DateTime, default=datetime.datetime.utcnow)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user1 = relationship("User", foreign_keys=[user1_id])
    user2 = relationship("User", foreign_keys=[user2_id])
    messages = relationship(
        "Message", back_populates="conversation",
        cascade="all, delete-orphan", order_by="Message.created_at.asc()"
    )


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, default="")
    media_url = Column(String, default="")
    media_type = Column(String, default="text")    # text | image | video | audio | file
    file_name = Column(String, default="")          # original filename
    shared_post_id = Column(Integer, ForeignKey("posts.id", ondelete="SET NULL"), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id])
    shared_post = relationship("Post", foreign_keys=[shared_post_id])
