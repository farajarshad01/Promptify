"""
shopify_auth.py — Shopify OAuth 2.0 Authorization
====================================================
This module handles the complete Shopify OAuth flow:

  1. generate_auth_url()  — Build the authorization URL for a shop
  2. verify_hmac()        — Validate callback authenticity
  3. exchange_code()      — Swap the temp code for a permanent token
  4. save_token()         — Persist token per user
  5. get_token()          — Retrieve stored token for a user
  6. delete_token()       — Remove a stored token

Tokens are stored in a local JSON file (.shopify_tokens.json)
using the same pattern as auth_service.py's demo user storage.
"""

import os
import json
import hmac
import hashlib
import secrets
import httpx
from urllib.parse import urlencode
from dotenv import load_dotenv

load_dotenv()

# ── Configuration from .env ────────────────────────────────────
SHOPIFY_API_KEY = os.getenv("SHOPIFY_API_KEY", "")
SHOPIFY_API_SECRET = os.getenv("SHOPIFY_API_SECRET", "")
SHOPIFY_REDIRECT_URI = os.getenv("SHOPIFY_REDIRECT_URI", "http://localhost:8000/api/shopify/callback")
SHOPIFY_SCOPES = os.getenv("SHOPIFY_SCOPES", "write_products,read_products,write_themes,read_themes")

# Whether OAuth is configured (API key + secret present)
IS_OAUTH_CONFIGURED = bool(SHOPIFY_API_KEY and SHOPIFY_API_SECRET)

# ── Persistent token store ─────────────────────────────────────
_TOKENS_FILE = os.path.join(os.path.dirname(__file__), ".shopify_tokens.json")

# In-memory nonce store for CSRF protection
# Maps nonce → shop domain (cleared after use)
_pending_nonces: dict[str, str] = {}


def _load_tokens() -> dict:
    """Load the token store from disk."""
    try:
        if os.path.exists(_TOKENS_FILE):
            with open(_TOKENS_FILE, "r") as f:
                return json.load(f)
    except Exception:
        pass
    return {}


def _save_tokens(tokens: dict):
    """Write the token store to disk."""
    try:
        with open(_TOKENS_FILE, "w") as f:
            json.dump(tokens, f, indent=2)
    except Exception as e:
        print(f"[Shopify Auth] Warning: could not persist tokens: {e}")


# ── OAuth URL Generation ───────────────────────────────────────

def generate_auth_url(shop_domain: str, user_id: str) -> str:
    """
    Build the Shopify OAuth authorization URL.

    Args:
        shop_domain: e.g. "my-store.myshopify.com"
        user_id:     The Promptify user ID (embedded in state for callback)

    Returns:
        The full authorization URL to redirect the user to.
    """
    if not IS_OAUTH_CONFIGURED:
        raise ValueError(
            "Shopify OAuth is not configured. "
            "Set SHOPIFY_API_KEY and SHOPIFY_API_SECRET in your .env file."
        )

    # Normalize domain
    shop_domain = _normalize_shop(shop_domain)

    # Generate a nonce for CSRF protection
    nonce = secrets.token_urlsafe(32)
    # State carries both the nonce and user_id so we can associate on callback
    state = f"{nonce}:{user_id}"
    _pending_nonces[nonce] = shop_domain

    params = {
        "client_id": SHOPIFY_API_KEY,
        "scope": SHOPIFY_SCOPES,
        "redirect_uri": SHOPIFY_REDIRECT_URI,
        "state": state,
        "grant_options[]": "per-user",  # Request offline access
    }

    # For offline (permanent) tokens, don't include grant_options
    # Shopify defaults to offline access when grant_options is omitted
    del params["grant_options[]"]

    return f"https://{shop_domain}/admin/oauth/authorize?{urlencode(params)}"


# ── HMAC Verification ─────────────────────────────────────────

def verify_hmac(query_params: dict) -> bool:
    """
    Verify the HMAC signature on the OAuth callback.

    Shopify signs the callback URL with your API secret.
    This prevents attackers from forging callback requests.
    """
    if not SHOPIFY_API_SECRET:
        return False

    received_hmac = query_params.get("hmac", "")
    if not received_hmac:
        return False

    # Build the message: sorted query params excluding 'hmac'
    filtered = {k: v for k, v in query_params.items() if k != "hmac"}
    sorted_params = "&".join(f"{k}={v}" for k, v in sorted(filtered.items()))

    computed = hmac.new(
        SHOPIFY_API_SECRET.encode("utf-8"),
        sorted_params.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(computed, received_hmac)


def verify_nonce(state: str) -> tuple[bool, str, str]:
    """
    Verify the nonce from the state parameter.

    Returns:
        (is_valid, nonce, user_id)
    """
    try:
        nonce, user_id = state.rsplit(":", 1)
    except ValueError:
        return False, "", ""

    if nonce in _pending_nonces:
        del _pending_nonces[nonce]  # One-time use
        return True, nonce, user_id

    return False, nonce, ""


# ── Token Exchange ─────────────────────────────────────────────

async def exchange_code(shop_domain: str, code: str) -> str:
    """
    Exchange the temporary authorization code for a permanent access token.

    Args:
        shop_domain: e.g. "my-store.myshopify.com"
        code:        The temporary code from Shopify's callback.

    Returns:
        The permanent access token string.
    """
    shop_domain = _normalize_shop(shop_domain)
    url = f"https://{shop_domain}/admin/oauth/access_token"

    payload = {
        "client_id": SHOPIFY_API_KEY,
        "client_secret": SHOPIFY_API_SECRET,
        "code": code,
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, timeout=15.0)

        if not response.is_success:
            raise ValueError(
                f"Token exchange failed (HTTP {response.status_code}): "
                f"{response.text[:200]}"
            )

        data = response.json()
        access_token = data.get("access_token")
        if not access_token:
            raise ValueError(f"No access_token in Shopify response: {data}")

        return access_token


# ── Token Storage ──────────────────────────────────────────────

def save_token(user_id: str, shop_domain: str, access_token: str):
    """Save a Shopify access token for a user."""
    shop_domain = _normalize_shop(shop_domain)
    tokens = _load_tokens()
    tokens[user_id] = {
        "shop": shop_domain,
        "access_token": access_token,
    }
    _save_tokens(tokens)
    print(f"[Shopify Auth] Token saved for user {user_id[:8]}… → {shop_domain}")


def get_token(user_id: str) -> dict | None:
    """
    Get the stored Shopify credentials for a user.

    Returns:
        {"shop": "store.myshopify.com", "access_token": "shpat_..."} or None
    """
    tokens = _load_tokens()
    return tokens.get(user_id)


def delete_token(user_id: str) -> bool:
    """Remove the stored token for a user. Returns True if one was found."""
    tokens = _load_tokens()
    if user_id in tokens:
        del tokens[user_id]
        _save_tokens(tokens)
        print(f"[Shopify Auth] Token removed for user {user_id[:8]}…")
        return True
    return False


# ── Helpers ────────────────────────────────────────────────────

def _normalize_shop(shop: str) -> str:
    """
    Normalize a shop identifier to a bare myshopify.com domain.
    Accepts: "my-store", "my-store.myshopify.com", "https://my-store.myshopify.com"
    Returns: "my-store.myshopify.com"
    """
    shop = shop.strip().lower()
    shop = shop.replace("https://", "").replace("http://", "").strip("/")
    if "/" in shop:
        shop = shop.split("/")[0]
    if not shop.endswith(".myshopify.com"):
        shop = f"{shop}.myshopify.com"
    return shop
