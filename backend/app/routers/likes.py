# Likes are handled inside posts.py (/posts/{id}/like)
# and comments.py (/posts/{id}/comments/{id}/like)
# This stub keeps backward compatibility if any import references this module.
from fastapi import APIRouter
router = APIRouter(tags=["Likes"])
