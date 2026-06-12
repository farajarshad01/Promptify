"""
auth_service.py — Authentication Service
"""

import os
import uuid
import json
import jwt
import bcrypt
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

load_dotenv()

# ── Configuration ──────────────────────────────────────────────
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "promptify-dev-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 72  # Extend to 3 days for better DX

# Auth always uses local JWTs — Supabase is only for the stores DB.
# IS_DEMO_MODE here controls whether we use the local user file or Supabase Auth.
# Since we don't integrate Supabase Auth, this is always True (local JWT mode).
IS_DEMO_MODE = True

# ── Persistent demo user store ─────────────────────────────────
# Saves to a local JSON file so users survive backend restarts.
_DEMO_USERS_FILE = os.path.join(os.path.dirname(__file__), ".demo_users.json")

def _load_demo_users() -> list:
    try:
        if os.path.exists(_DEMO_USERS_FILE):
            with open(_DEMO_USERS_FILE, "r") as f:
                return json.load(f)
    except Exception:
        pass
    return []

def _save_demo_users(users: list):
    try:
        with open(_DEMO_USERS_FILE, "w") as f:
            json.dump(users, f, indent=2)
    except Exception as e:
        print(f"[Auth] Warning: could not persist demo users: {e}")

_demo_users = _load_demo_users()


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def _verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def _create_token(user_id: str, email: str, name: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {
        "sub": user_id,
        "email": email,
        "name": name,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


async def signup(email: str, password: str, name: str) -> dict:
    email = email.lower().strip()
    if IS_DEMO_MODE:
        for user in _demo_users:
            if user["email"] == email:
                raise ValueError("An account with this email already exists")
        user = {
            "id": str(uuid.uuid4()),
            "email": email,
            "name": name,
            "avatar_url": None,
            "password_hash": _hash_password(password),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        _demo_users.append(user)
        _save_demo_users(_demo_users)
        token = _create_token(user["id"], user["email"], user["name"])
        return {"user": {"id": user["id"], "email": user["email"], "name": user["name"], "avatar_url": user["avatar_url"]}, "token": token}

    # (Production Supabase Auth not integrated — local JWT always used)


async def login(email: str, password: str) -> dict:
    email = email.lower().strip()
    # Reload users from disk in case another process added one
    global _demo_users
    if IS_DEMO_MODE:
        _demo_users = _load_demo_users()
        for user in _demo_users:
            if user["email"] == email:
                if _verify_password(password, user["password_hash"]):
                    token = _create_token(user["id"], user["email"], user["name"])
                    return {"user": {"id": user["id"], "email": user["email"], "name": user["name"], "avatar_url": user.get("avatar_url")}, "token": token}
        raise ValueError("Invalid email or password")


async def social_login(email: str, name: str, avatar_url: str = None) -> dict:
    """
    Handle social login by creating or fetching a user record.
    Returns the user info and a custom JWT.
    """
    email = email.lower().strip()
    user_id = None
    
    if IS_DEMO_MODE:
        # Check if user already exists
        for user in _demo_users:
            if user["email"] == email:
                user_id = user["id"]
                if avatar_url: user["avatar_url"] = avatar_url
                break
        
        if not user_id:
            # Create new demo user
            user = {
                "id": str(uuid.uuid4()),
                "email": email,
                "name": name,
                "avatar_url": avatar_url,
                "password_hash": None,  # No password for social users
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            _demo_users.append(user)
            _save_demo_users(_demo_users)
            user_id = user["id"]
        
        token = _create_token(user_id, email, name)
        return {
            "user": {"id": user_id, "email": email, "name": name, "avatar_url": avatar_url},
            "token": token
        }
    
    # Production: Upsert in Supabase 'users' table
    # This logic assumes a 'users' table exists in Supabase
    try:
        from supabase_service import _get_client
        client = _get_client()
        
        # Check for existing user
        res = client.table("users").select("*").eq("email", email).execute()
        if res.data:
            user = res.data[0]
            user_id = user["id"]
            # Update name/avatar if provided
            client.table("users").update({"name": name, "avatar_url": avatar_url}).eq("id", user_id).execute()
        else:
            # Create new user
            res = client.table("users").insert({
                "email": email,
                "name": name,
                "avatar_url": avatar_url
            }).execute()
            user = res.data[0]
            user_id = user["id"]
            
        token = _create_token(user_id, email, name)
        return {
            "user": {"id": user_id, "email": email, "name": name, "avatar_url": avatar_url},
            "token": token
        }
    except Exception as e:
        print(f"[Auth Error] social_login failed: {e}")
        # Fallback to a generic response if DB upsert fails but we trust the OAuth
        user_id = user_id or "social-user-id"
        token = _create_token(user_id, email, name)
        return {
            "user": {"id": user_id, "email": email, "name": name, "avatar_url": avatar_url},
            "token": token
        }


async def update_profile(user_id: str, name: str = None, avatar_url: str = None) -> dict:
    """Update user's display name or avatar."""
    if IS_DEMO_MODE:
        global _demo_users
        _demo_users = _load_demo_users()
        for user in _demo_users:
            if user["id"] == user_id:
                if name: user["name"] = name
                if avatar_url: user["avatar_url"] = avatar_url
                _save_demo_users(_demo_users)
                return {"id": user["id"], "email": user["email"], "name": user["name"], "avatar_url": user.get("avatar_url")}
        raise ValueError("User not found")
    
    # Production: update in Supabase
    from supabase_service import update_user_profile
    return await update_user_profile(user_id, name, avatar_url)


async def get_user_from_token(token: str) -> dict:
    try:
        payload = verify_token(token)
        # In a real app, you might fetch from DB to get latest avatar_url
        # For now, we'll return what's in the token or just basic info
        return {"id": payload["sub"], "email": payload["email"], "name": payload["name"], "avatar_url": payload.get("avatar_url")}
    except Exception as e:
        print(f"[Auth Error] get_user_from_token failed: {e}")
        raise ValueError("Invalid token")
