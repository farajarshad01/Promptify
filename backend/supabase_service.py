"""
supabase_service.py — Database Layer
=====================================
This module handles all database operations using Supabase.
It stores generated store blueprints and their deployment status.

When no Supabase credentials are configured, it uses an in-memory
store so the app can function fully in demo mode.
"""

import os
import uuid
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

# ── Check if Supabase is configured ────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
IS_DEMO_MODE = not SUPABASE_URL or not SUPABASE_KEY

# ── In-memory store for demo mode ──────────────────────────────
# This list acts as a simple "database" when Supabase isn't set up.
_demo_stores = []

# ── Supabase client (initialized lazily) ───────────────────────
_supabase_client = None


def _get_client():
    """
    Lazily initialize and return the Supabase client.
    This avoids import errors when supabase isn't installed.
    """
    global _supabase_client
    if _supabase_client is None:
        from supabase import create_client
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _supabase_client


async def save_store(name: str, json_config: dict, user_id: str, prompt: str = None, template: str = None) -> dict:
    """
    Save a new store record to the database.

    Args:
        name:        The store name from the blueprint.
        json_config: The complete blueprint JSON.
        user_id:     The ID of the user who owns this store.
        prompt:      The user's original prompt.
        template:    The template used (if any).

    Returns:
        The created store record.
    """
    if IS_DEMO_MODE:
        return {
            "id": str(uuid.uuid4()),
            "name": name,
            "user_id": user_id,
            "status": "draft",
            "json_config": json_config,
            "prompt": prompt,
            "template": template,
            "created_at": datetime.now(timezone.utc).isoformat()
        }

    # ── Production: Insert into Supabase ───────────────────────
    try:
        client = _get_client()
        result = client.table("stores").insert({
            "name": name,
            "user_id": user_id,
            "json_config": json_config,
            "prompt": prompt,
            "template": template,
        }).execute()
        return result.data[0] if result.data else {}
    except Exception as e:
        print(f"[Supabase Error] save_store: {e}")
        # Fallback to a temporary record so the UI doesn't crash
        return {
            "id": f"temp_{uuid.uuid4().hex[:8]}",
            "name": name,
            "user_id": user_id,
            "status": "draft",
            "json_config": json_config,
            "created_at": datetime.now(timezone.utc).isoformat()
        }


async def update_store_status(store_id: str, status: str) -> dict:
    """
    Update the deployment status of a store.

    Args:
        store_id: The UUID of the store record.
        status:   New status — 'draft', 'deployed', or 'failed'.

    Returns:
        The updated store record.
    """
    if IS_DEMO_MODE:
        return {"id": store_id, "status": status}

    # ── Production: Update in Supabase ─────────────────────────
    try:
        client = _get_client()
        result = client.table("stores").update({
            "status": status,
        }).eq("id", store_id).execute()
        return result.data[0] if result.data else {}
    except Exception as e:
        print(f"[Supabase Error] update_store_status: {e}")
        return {"id": store_id, "status": status, "error": str(e)}


async def get_all_stores() -> list:
    """
    Fetch all store records, ordered by newest first.

    Returns:
        A list of store record dictionaries.
    """
    if IS_DEMO_MODE:
        return _demo_stores

    # ── Production: Query Supabase ─────────────────────────────
    try:
        client = _get_client()
        result = client.table("stores").select("*").order(
            "created_at", desc=True
        ).execute()
        return result.data or []
    except Exception as e:
        print(f"[Supabase Error] get_all_stores: {e}")
        return []


async def get_store(store_id: str) -> dict:
    """
    Fetch a single store by its ID.

    Args:
        store_id: The UUID of the store record.

    Returns:
        The store record dictionary, or empty dict if not found.
    """
    if IS_DEMO_MODE:
        for s in _demo_stores:
            if s["id"] == store_id:
                return s
        return {}

    # ── Production: Query Supabase ─────────────────────────────
    try:
        client = _get_client()
        result = client.table("stores").select("*").eq(
            "id", store_id
        ).single().execute()
        return result.data or {}
    except Exception as e:
        print(f"[Supabase Error] get_store: {e}")
        return {}


async def upload_avatar(file_content: bytes, file_name: str, user_id: str) -> str:
    """
    Upload a user avatar to Supabase Storage.
    Returns the public URL of the uploaded file.
    """
    if IS_DEMO_MODE:
        return "https://api.dicebear.com/7.x/avataaars/svg?seed=" + user_id

    try:
        client = _get_client()
        # Storage bucket must be named 'avatars'
        bucket_name = "avatars"
        file_path = f"{user_id}/{file_name}"
        
        # Upload file to Supabase Storage
        client.storage.from_(bucket_name).upload(
            path=file_path,
            file=file_content,
            file_options={"content-type": "image/png", "upsert": "true"}
        )
        
        # Get public URL
        url_response = client.storage.from_(bucket_name).get_public_url(file_path)
        return url_response
    except Exception as e:
        print(f"[Supabase Error] upload_avatar: {e}")
        # Fallback URL
        return "https://api.dicebear.com/7.x/avataaars/svg?seed=" + user_id


async def update_user_profile(user_id: str, name: str = None, avatar_url: str = None) -> dict:
    """
    Update a user's profile details in the database.
    """
    if IS_DEMO_MODE:
        return {"id": user_id, "name": name, "avatar_url": avatar_url}

    try:
        client = _get_client()
        update_data = {}
        if name: update_data["name"] = name
        if avatar_url: update_data["avatar_url"] = avatar_url
        
        result = client.table("users").update(update_data).eq("id", user_id).execute()
        return result.data[0] if result.data else {}
    except Exception as e:
        print(f"[Supabase Error] update_user_profile: {e}")
        return {"id": user_id, "error": str(e)}
