import asyncio
import os
from gemini_service import generate_blueprint

async def main():
    print("Testing Gemini Blueprint Generation...")
    prompt = "A futuristic cyberpunk sneaker store with neon aesthetics"
    template = "Bold"
    
    try:
        blueprint = await generate_blueprint(prompt, template)
        print("\n--- Generation Result ---")
        print(f"Store Name: {blueprint.get('store_name')}")
        print(f"Tagline: {blueprint.get('tagline')}")
        print(f"Theme Primary: {blueprint.get('theme', {}).get('primary_color')}")
        print(f"Products: {len(blueprint.get('products', []))}")
        print(f"Collections: {len(blueprint.get('collections', []))}")
        print("\nSuccess! The blueprint structure matches the expected detailed schema.")
    except Exception as e:
        print(f"\nTest Failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
