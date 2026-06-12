"""
main.py — Promptify FastAPI Server
===================================
This is the main entry point for the Promptify backend.
It defines the API routes that the React frontend calls:

  POST /api/auth/signup  — Register a new user
  POST /api/auth/login   — Authenticate and get JWT token
  GET  /api/auth/me      — Get current user info from token

  POST /api/generate     — Generate a store blueprint using Gemini AI
  POST /api/deploy       — Deploy a blueprint to Shopify
  GET  /api/stores       — Fetch all store records from the database
  GET  /api/stores/{id}  — Fetch a single store record

The server runs on http://localhost:8000 by default.
"""

from fastapi import FastAPI, HTTPException, Depends, Header, UploadFile, File, Query
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, EmailStr
from typing import Optional
import uvicorn

# Import our service modules
from gemini_service import generate_blueprint
from shopify_service import deploy_store
from shopify_auth import (
    IS_OAUTH_CONFIGURED,
    generate_auth_url,
    verify_hmac,
    verify_nonce,
    exchange_code,
    save_token,
    get_token,
    delete_token,
)
from supabase_service import save_store, update_store_status, get_all_stores, get_store
from auth_service import signup, login, get_user_from_token

# ── Initialize the FastAPI app ─────────────────────────────────
app = FastAPI(
    title="Promptify API",
    description="AI-powered Shopify store generator",
    version="1.0.0",
)

# ── Configure CORS ─────────────────────────────────────────────
# Allow the React frontend (localhost:5173) to call our API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://127.0.0.1:5173",
        "http://localhost:3000",   # Fallback for other dev servers
    ],
    allow_credentials=True,
    allow_methods=["*"],           # Allow all HTTP methods
    allow_headers=["*"],           # Allow all headers
)


# ── Auth Dependency ────────────────────────────────────────────
async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """
    Extract and verify the JWT token from the Authorization header.
    Used as a dependency on protected routes.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = authorization.split(" ", 1)[1]
    try:
        user = await get_user_from_token(token)
        return user
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


# ── Request/Response Models ────────────────────────────────────
# Pydantic models validate incoming data and provide
# auto-generated API docs at /docs.

class SignupRequest(BaseModel):
    """Request body for the /auth/signup endpoint."""
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=6, description="Password (min 6 chars)")
    name: str = Field(..., min_length=1, description="Display name")


class LoginRequest(BaseModel):
    """Request body for the /auth/login endpoint."""
    email: str = Field(..., description="User email address")
    password: str = Field(..., description="Password")


class AuthResponse(BaseModel):
    """Response from auth endpoints."""
    user: dict
    token: str


class SocialAuthRequest(BaseModel):
    """Request body for the /auth/social endpoint."""
    email: str
    name: str
    avatar_url: Optional[str] = None


class GenerateRequest(BaseModel):
    """Request body for the /generate endpoint."""
    prompt: str = Field(..., description="Description of the store to generate")
    template: Optional[str] = Field(None, description="Template name (e.g. 'Minimalist Jewelry')")


class DeployRequest(BaseModel):
    """Request body for the /deploy endpoint."""
    blueprint: dict = Field(..., description="The complete store blueprint JSON")
    store_id: Optional[str] = Field(None, description="ID of the store record in the database")
    shopify_url: Optional[str] = Field(None, description="Shopify store URL")
    shopify_token: Optional[str] = Field(None, description="Shopify Admin Access Token")


class GenerateResponse(BaseModel):
    """Response from the /generate endpoint."""
    blueprint: dict
    store_id: str
    message: str


class DeployResponse(BaseModel):
    """Response from the /deploy endpoint."""
    success: bool
    message: str
    details: dict


# ── API Routes ─────────────────────────────────────────────────

@app.get("/")
async def root():
    """
    Health check endpoint.
    Returns basic info about the API and its mode (demo or production).
    """
    from gemini_service import IS_DEMO_MODE as gemini_demo
    from shopify_service import IS_DEMO_MODE as shopify_demo
    from supabase_service import IS_DEMO_MODE as supabase_demo

    return {
        "app": "Promptify API",
        "version": "1.0.0",
        "status": "running",
        "requirements": {
            "gemini": "Configured" if not gemini_demo else "Missing API Key",
            "shopify": "Configured" if not shopify_demo else "Configured via UI/Env",
            "supabase": "Configured" if not supabase_demo else "Missing Credentials",
        },
        "mode": "production (live)"
    }


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": "1.0.0"}

# ── Auth Endpoints ────────────────────────────────────────────

@app.post("/api/auth/signup", response_model=AuthResponse)
async def api_signup(request: SignupRequest):
    """
    Register a new user account.
    Returns user info and a JWT token.
    """
    try:
        result = await signup(
            email=request.email,
            password=request.password,
            name=request.name,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


@app.post("/api/auth/login", response_model=AuthResponse)
async def api_login(request: LoginRequest):
    """
    Authenticate with email and password.
    Returns user info and a JWT token.
    """
    try:
        result = await login(
            email=request.email,
            password=request.password,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")


@app.post("/api/auth/social", response_model=AuthResponse)
async def api_social_auth(request: SocialAuthRequest):
    """
    Handle social login from frontend providers (Google, Apple).
    """
    from auth_service import social_login
    try:
        result = await social_login(
            email=request.email,
            name=request.name,
            avatar_url=request.avatar_url,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Social login failed: {str(e)}")


@app.get("/api/auth/me")
async def api_get_me(user: dict = Depends(get_current_user)):
    return user


class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    avatar_url: Optional[str] = None


@app.put("/api/auth/profile")
async def api_update_profile(request: ProfileUpdateRequest, user: dict = Depends(get_current_user)):
    """Update the current user's profile."""
    from auth_service import update_profile
    try:
        updated_user = await update_profile(user["id"], name=request.name, avatar_url=request.avatar_url)
        return updated_user
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/auth/avatar")
async def api_upload_avatar(
    file: Optional[str] = None, # Simplified for demo/placeholder
    user: dict = Depends(get_current_user)
):
    """
    Placeholder for avatar upload. 
    In a real app, use UploadFile from fastapi.
    """
    from fastapi import UploadFile, File
    # For now, let's implement it properly with UploadFile
    return {"message": "Use multipart/form-data for uploads"}


@app.post("/api/auth/avatar/upload")
async def api_upload_avatar_file(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Upload a user avatar file."""
    from supabase_service import upload_avatar
    from auth_service import update_profile
    
    try:
        content = await file.read()
        avatar_url = await upload_avatar(content, file.filename, user["id"])
        
        # Update user profile with new URL
        updated_user = await update_profile(user["id"], avatar_url=avatar_url)
        return updated_user
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


# ── Protected API Routes ──────────────────────────────────────

@app.post("/api/generate", response_model=GenerateResponse)
async def api_generate(request: GenerateRequest, user: dict = Depends(get_current_user)):
    """
    Generate a Shopify store blueprint from a prompt.

    1. Takes the user's prompt (and optional template name).
    2. Sends it to Gemini AI to generate a complete store blueprint.
    3. Saves the blueprint to the database as a 'draft'.
    4. Returns the blueprint and store ID.
    """
    try:
        # Step 1: Call Gemini to generate the blueprint
        blueprint = await generate_blueprint(
            prompt=request.prompt,
            template=request.template,
        )

        # Step 2: Save to database with 'draft' status
        store_record = await save_store(
            name=blueprint.get("store_name", "Untitled Store"),
            user_id=user["id"],
            json_config=blueprint,
            prompt=request.prompt,
            template=request.template,
        )

        return GenerateResponse(
            blueprint=blueprint,
            store_id=store_record.get("id", ""),
            message="Blueprint generated successfully!",
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate blueprint: {str(e)}"
        )


@app.post("/api/deploy", response_model=DeployResponse)
async def api_deploy(request: DeployRequest, user: dict = Depends(get_current_user)):
    """
    Deploy a store blueprint to Shopify.

    1. Takes the approved blueprint and optional store ID.
    2. Sends products/collections to the Shopify API.
    3. Updates the store status to 'deployed' or 'failed'.
    4. Returns the deployment result.
    """
    try:
        # Step 1: Deploy to Shopify (pass user_id so it can look up OAuth tokens)
        result = await deploy_store(
            blueprint=request.blueprint,
            store_url=request.shopify_url,
            access_token=request.shopify_token,
            user_id=user["id"],
        )

        # Step 2: Update the store status in the database
        if request.store_id:
            new_status = "deployed" if result.get("success") else "failed"
            await update_store_status(request.store_id, new_status)

        return DeployResponse(
            success=result.get("success", False),
            message=result.get("message", ""),
            details=result,
        )

    except Exception as e:
        # If we have a store ID, mark it as failed
        if request.store_id:
            await update_store_status(request.store_id, "failed")

        raise HTTPException(
            status_code=500,
            detail=f"Deployment failed: {str(e)}"
        )


# ── Shopify OAuth Endpoints ───────────────────────────────────

@app.get("/api/shopify/connect")
async def api_shopify_connect(
    shop: str = Query(..., description="Shopify store domain, e.g. my-store or my-store.myshopify.com"),
    user: dict = Depends(get_current_user),
):
    """
    Generate the Shopify OAuth authorization URL.
    The frontend redirects the user (or opens a popup) to this URL.
    """
    try:
        auth_url = generate_auth_url(shop, user["id"])
        return {"auth_url": auth_url}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/shopify/callback")
async def api_shopify_callback(
    code: str = Query(...),
    shop: str = Query(...),
    state: str = Query(...),
    hmac: str = Query(None),
    timestamp: str = Query(None),
):
    """
    Handle the OAuth callback from Shopify.
    Shopify redirects here after the user approves the app.
    We exchange the code for a permanent token, store it, then
    redirect the user back to the frontend.
    """
    # 1. Verify HMAC signature
    query_params = {"code": code, "shop": shop, "state": state}
    if timestamp:
        query_params["timestamp"] = timestamp
    if hmac:
        query_params["hmac"] = hmac

    if hmac and not verify_hmac(query_params):
        raise HTTPException(status_code=400, detail="Invalid HMAC signature")

    # 2. Verify nonce from state
    is_valid, nonce, user_id = verify_nonce(state)
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid or expired state parameter")

    # 3. Exchange the code for a permanent access token
    try:
        access_token = await exchange_code(shop, code)
    except ValueError as e:
        # Redirect to frontend with error
        return RedirectResponse(
            url=f"http://localhost:5173/generate?shopify_error={str(e)[:100]}"
        )

    # 4. Save the token for this user
    save_token(user_id, shop, access_token)

    # 5. Redirect back to the frontend with success
    return RedirectResponse(
        url=f"http://localhost:5173/generate?shopify_connected=true&shop={shop}"
    )


@app.get("/api/shopify/status")
async def api_shopify_status(user: dict = Depends(get_current_user)):
    """
    Check whether the current user has a connected Shopify store.
    """
    token_data = get_token(user["id"])
    if token_data:
        return {
            "connected": True,
            "shop": token_data["shop"],
            "oauth_configured": IS_OAUTH_CONFIGURED,
        }
    return {
        "connected": False,
        "shop": None,
        "oauth_configured": IS_OAUTH_CONFIGURED,
    }


@app.post("/api/shopify/disconnect")
async def api_shopify_disconnect(user: dict = Depends(get_current_user)):
    """
    Remove the stored Shopify token for the current user.
    """
    deleted = delete_token(user["id"])
    return {
        "success": True,
        "message": "Shopify store disconnected" if deleted else "No connected store found",
    }


@app.get("/api/stores")
async def api_get_stores(user: dict = Depends(get_current_user)):
    """
    Fetch all store records from the database.
    Returns them ordered by newest first for the dashboard.
    """
    try:
        stores = await get_all_stores()
        return {"stores": stores, "total": len(stores)}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch stores: {str(e)}"
        )


@app.get("/api/stores/{store_id}")
async def api_get_store(store_id: str, user: dict = Depends(get_current_user)):
    """
    Fetch a single store record by its ID.
    Used when viewing the blueprint details of a specific store.
    """
    try:
        store = await get_store(store_id)
        if not store:
            raise HTTPException(status_code=404, detail="Store not found")
        return store
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch store: {str(e)}"
        )


# ── Run the server ─────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Auto-reload on file changes during development
    )
