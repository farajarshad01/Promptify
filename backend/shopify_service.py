"""
shopify_service.py — Shopify Store Deployment
=============================================
This module handles deploying a store blueprint to Shopify
using the Shopify Admin GraphQL API via httpx.

If credentials are provided in the call, it uses those.
Otherwise, it falls back to .env variables.
"""

import os
import json
import asyncio
import httpx
from dotenv import load_dotenv

load_dotenv()

# ── Check if Shopify is configured globally ────────────────────
GLOBAL_SHOPIFY_STORE_URL = os.getenv("SHOPIFY_STORE_URL", "")
GLOBAL_SHOPIFY_ACCESS_TOKEN = os.getenv("SHOPIFY_ACCESS_TOKEN", "")
IS_DEMO_MODE = not GLOBAL_SHOPIFY_STORE_URL or not GLOBAL_SHOPIFY_ACCESS_TOKEN

API_VERSION = "2024-07"


async def _graphql(client: httpx.AsyncClient, shop_domain: str, token: str, query: str, variables: dict) -> dict:
    """
    Execute a single Shopify Admin GraphQL request.
    Raises on HTTP errors or GraphQL userErrors.
    """
    url = f"https://{shop_domain}/admin/api/{API_VERSION}/graphql.json"
    headers = {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json",
    }
    payload = {"query": query, "variables": variables}

    response = await client.post(url, headers=headers, json=payload, timeout=30.0)

    # Raise on HTTP-level errors (401, 403, 404, 5xx…)
    if response.status_code == 401:
        raise ValueError(
            "Shopify returned 401 Unauthorized. "
            "Check that your Access Token is correct and has the required scopes "
            "(write_products, write_collections)."
        )
    if response.status_code == 403:
        raise ValueError(
            "Shopify returned 403 Forbidden. "
            "Your token may lack the required API scopes."
        )
    if not response.is_success:
        raise ValueError(f"Shopify API HTTP error {response.status_code}: {response.text[:300]}")

    data = response.json()

    # Surface GraphQL-level userErrors
    errors = data.get("errors")
    if errors:
        msg = "; ".join(e.get("message", str(e)) for e in errors)
        raise ValueError(f"Shopify GraphQL error: {msg}")

    return data.get("data", {})


async def deploy_store(blueprint: dict, store_url: str = None, access_token: str = None, user_id: str = None) -> dict:
    """
    Deploy a store blueprint to Shopify.

    Args:
        blueprint:    The complete store blueprint dictionary.
        store_url:    Optional Shopify store URL (e.g. your-store.myshopify.com)
        access_token: Optional Shopify Admin Access Token.
        user_id:      Optional user ID — used to look up stored OAuth tokens.

    Returns:
        A dict with deployment status and details.
    """
    # Use provided credentials or fallback to stored OAuth token, then env
    url = store_url or GLOBAL_SHOPIFY_STORE_URL
    token = access_token or GLOBAL_SHOPIFY_ACCESS_TOKEN

    # If still no credentials, try looking up the user's stored OAuth token
    if (not url or not token) and user_id:
        try:
            from shopify_auth import get_token
            oauth_data = get_token(user_id)
            if oauth_data:
                url = url or oauth_data["shop"]
                token = token or oauth_data["access_token"]
        except ImportError:
            pass

    is_demo = not url or not token

    if is_demo:
        return await _demo_deploy(blueprint)

    # ── Production Mode: Call Shopify Admin GraphQL API ────────
    # Normalize: strip protocol and trailing slashes to get bare domain
    shop_domain = (
        url.replace("https://", "")
           .replace("http://", "")
           .strip("/")
           .split("/")[0]
    )

    created_products = []
    created_collections = []
    errors_encountered = []

    try:
        async with httpx.AsyncClient() as client:

            # ── Create Products ────────────────────────────────
            product_mutation = """
            mutation productCreate($input: ProductInput!) {
              productCreate(input: $input) {
                product { id title }
                userErrors { field message }
              }
            }
            """

            for product in blueprint.get("products", []):
                try:
                    variables = {
                        "input": {
                            "title": product["title"],
                            "descriptionHtml": f"<p>{product.get('description', '')}</p>",
                            "vendor": blueprint.get("store_name", "Promptify Store"),
                            "productType": product.get("category", "General"),
                            "tags": product.get("tags", []),
                        }
                    }
                    data = await _graphql(client, shop_domain, token, product_mutation, variables)
                    user_errors = data.get("productCreate", {}).get("userErrors", [])
                    if user_errors:
                        msg = "; ".join(e["message"] for e in user_errors)
                        errors_encountered.append(f"Product '{product['title']}': {msg}")
                    else:
                        created_products.append(product["title"])
                except Exception as e:
                    errors_encountered.append(f"Product '{product.get('title', '?')}': {str(e)}")

            # ── Create Collections ─────────────────────────────
            collection_mutation = """
            mutation collectionCreate($input: CollectionInput!) {
              collectionCreate(input: $input) {
                collection { id title }
                userErrors { field message }
              }
            }
            """

            for collection in blueprint.get("collections", []):
                try:
                    variables = {
                        "input": {
                            "title": collection["title"],
                            "descriptionHtml": f"<p>{collection.get('description', '')}</p>",
                        }
                    }
                    data = await _graphql(client, shop_domain, token, collection_mutation, variables)
                    user_errors = data.get("collectionCreate", {}).get("userErrors", [])
                    if user_errors:
                        msg = "; ".join(e["message"] for e in user_errors)
                        errors_encountered.append(f"Collection '{collection['title']}': {msg}")
                    else:
                        created_collections.append(collection["title"])
                except Exception as e:
                    errors_encountered.append(f"Collection '{collection.get('title', '?')}': {str(e)}")

        # ── Build result ───────────────────────────────────────
        if errors_encountered and not created_products and not created_collections:
            # Total failure — nothing was created
            return {
                "success": False,
                "message": f"Deployment failed: {errors_encountered[0]}",
                "errors": errors_encountered,
                "products_created": 0,
                "collections_created": 0,
            }

        # Partial or full success
        msg_parts = [f"Created {len(created_products)} product(s) and {len(created_collections)} collection(s)."]
        if errors_encountered:
            msg_parts.append(f"{len(errors_encountered)} item(s) had errors.")

        return {
            "success": True,
            "message": " ".join(msg_parts),
            "products_created": len(created_products),
            "collections_created": len(created_collections),
            "store_url": f"https://{shop_domain}",
            "errors": errors_encountered if errors_encountered else [],
        }

    except ValueError as e:
        # Auth / HTTP errors surfaced from _graphql()
        print(f"[Shopify Error] {e}")
        return {
            "success": False,
            "message": str(e),
            "error": str(e),
            "products_created": 0,
            "collections_created": 0,
        }
    except Exception as e:
        print(f"[Shopify Error] Unexpected deployment failure: {e}")
        return {
            "success": False,
            "message": f"Deployment failed: {str(e)}",
            "error": str(e),
            "products_created": 0,
            "collections_created": 0,
        }


async def _demo_deploy(blueprint: dict) -> dict:
    """
    Simulates a Shopify deployment in demo mode.
    Adds a 2-second delay to mimic real API latency.
    """
    await asyncio.sleep(2)

    product_count = len(blueprint.get("products", []))
    collection_count = len(blueprint.get("collections", []))

    return {
        "success": True,
        "message": "✨ Store deployed successfully! (Demo Mode)",
        "products_created": product_count,
        "collections_created": collection_count,
        "store_url": f"https://{blueprint.get('store_name', 'demo').lower().replace(' ', '-')}.myshopify.com",
        "demo_mode": True,
    }
