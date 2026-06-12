"""
gemini_service.py — AI Store Blueprint Generator
=================================================
This module handles communication with Google's Gemini API.
It sends a structured prompt and expects a JSON "store blueprint"
containing everything needed to build a Shopify store.

When no API key is configured, it returns realistic demo data
so the frontend can be developed and tested independently.
"""

import json
import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

# ── Check if Gemini is configured ──────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
IS_DEMO_MODE = not GEMINI_API_KEY or GEMINI_API_KEY == "your_google_gemini_key_here"


def _get_system_prompt():
    """
    Returns the system prompt that instructs Gemini to act as
    a Shopify store architect. The prompt enforces strict JSON
    output with a predefined schema.
    """
    return """You are an expert Shopify store architect. When given a store concept,
you MUST return ONLY valid JSON (no markdown, no explanation) following this exact schema:

{
  "store_name": "string — creative store name",
  "tagline": "string — catchy one-liner for the store",
  "description": "string — 2-3 sentence store description",
  "theme": {
    "primary_color": "string — hex color",
    "secondary_color": "string — hex color",
    "accent_color": "string — hex color",
    "font_heading": "string — Google Font name",
    "font_body": "string — Google Font name",
    "style": "string — e.g. minimalist, bold, elegant, playful"
  },
  "navbar": {
    "logo_text": "string — text logo or brand name",
    "links": ["string — nav link labels, e.g. Shop, About, Contact"]
  },
  "hero": {
    "headline": "string — hero section headline",
    "subheadline": "string — supporting text",
    "cta_text": "string — call-to-action button text"
  },
  "products": [
    {
      "title": "string",
      "description": "string — 1-2 sentences",
      "price": "string — e.g. 29.99",
      "category": "string",
      "tags": ["string"],
      "variants": ["string — e.g. size or color options"]
    }
  ],
  "collections": [
    {
      "title": "string",
      "description": "string",
      "product_count": "number"
    }
  ],
  "pages": {
    "about": {
      "title": "string",
      "content": "string — 2-3 paragraphs about the brand story"
    },
    "contact": {
      "title": "string",
      "email": "string",
      "phone": "string",
      "address": "string"
    },
    "faq": [
      {
        "question": "string",
        "answer": "string"
      }
    ]
  },
  "social_media": {
    "instagram": "string — handle or URL",
    "twitter": "string — handle or URL",
    "facebook": "string — URL",
    "tiktok": "string — handle or URL",
    "pinterest": "string — handle or URL"
  },
  "footer": {
    "copyright": "string",
    "links": ["string — footer link labels"],
    "newsletter_cta": "string — e.g. Subscribe for 10% off"
  },
  "seo": {
    "meta_title": "string",
    "meta_description": "string",
    "keywords": ["string"]
  }
}

Generate 4-6 realistic products and 2-3 collections. Be creative and specific to the store concept.
All prices should be realistic. Make the content feel like a real premium brand.
Respond ONLY with the raw JSON, no markdown formatting."""


async def generate_blueprint(prompt: str, template: str = None) -> dict:
    """
    Generate a store blueprint from a user prompt.

    Args:
        prompt:   The user's description of their desired store.
        template: Optional template name (e.g. "Minimalist Jewelry").

    Returns:
        A dictionary containing the complete store blueprint.
    """
    # ── Demo Mode: Return sample data ──────────────────────────
    if IS_DEMO_MODE:
        return _get_demo_blueprint(prompt, template)

    client = genai.Client(api_key=GEMINI_API_KEY)
    
    user_prompt = f"Template context: {template}\n\nUser request: {prompt}" if template else f"User request: {prompt}"
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=_get_system_prompt(),
                temperature=0.7,
            ),
        )

        # Clean up the markdown formatting if the model accidentally included it
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
            
        return json.loads(text.strip())

    except Exception as e:
        print(f"[Gemini Error] Generation failed: {e}")
        # Fallback to demo mode if API call fails
        return _get_demo_blueprint(prompt, template)


def _get_demo_blueprint(prompt: str, template: str = None) -> dict:
    """
    Returns a realistic demo blueprint when the Gemini API
    is not configured. This allows full UI testing without
    needing an API key.
    """
    # Choose demo data based on template or default
    store_type = template or "Custom Store"

    demos = {
        "Minimalist Jewelry": {
            "store_name": "Lunara Studio",
            "tagline": "Timeless pieces for the modern soul",
            "description": "Lunara Studio crafts minimalist jewelry that speaks volumes through simplicity. Each piece is designed with intention, using ethically sourced materials and timeless silhouettes that transition effortlessly from day to night.",
            "theme": {
                "primary_color": "#2C2C2C",
                "secondary_color": "#D4AF37",
                "accent_color": "#F5F0EB",
                "font_heading": "Cormorant Garamond",
                "font_body": "Open Sans",
                "style": "minimalist"
            },
            "navbar": {
                "logo_text": "LUNARA",
                "links": ["Shop", "Collections", "About", "Journal", "Contact"]
            },
            "hero": {
                "headline": "Adorn Your Essence",
                "subheadline": "Handcrafted minimalist jewelry for those who believe less is more",
                "cta_text": "Explore Collection"
            },
            "products": [
                {"title": "Luna Crescent Necklace", "description": "A delicate crescent moon pendant on a 16-inch gold-filled chain. Subtle yet striking.", "price": "89.00", "category": "Necklaces", "tags": ["gold", "crescent", "minimalist"], "variants": ["16 inch", "18 inch", "20 inch"]},
                {"title": "Solstice Ring Set", "description": "Three stackable rings in mixed metals. Wear them together or apart for versatile styling.", "price": "65.00", "category": "Rings", "tags": ["stackable", "mixed-metals", "everyday"], "variants": ["Size 5", "Size 6", "Size 7", "Size 8"]},
                {"title": "Ember Drop Earrings", "description": "Geometric drop earrings with a brushed gold finish. Lightweight for all-day comfort.", "price": "52.00", "category": "Earrings", "tags": ["geometric", "gold", "lightweight"], "variants": ["Gold", "Silver", "Rose Gold"]},
                {"title": "Meridian Cuff Bracelet", "description": "An open cuff bracelet with a hammered texture. Adjustable to fit most wrists.", "price": "78.00", "category": "Bracelets", "tags": ["cuff", "hammered", "adjustable"], "variants": ["Gold", "Silver"]},
                {"title": "Aura Chain Bracelet", "description": "A dainty chain bracelet with a single freshwater pearl accent.", "price": "45.00", "category": "Bracelets", "tags": ["pearl", "delicate", "chain"], "variants": ["Gold", "Silver", "Rose Gold"]}
            ],
            "collections": [
                {"title": "The Essentials", "description": "Our core everyday pieces that form the foundation of any jewelry collection.", "product_count": 8},
                {"title": "Celestial Line", "description": "Moon and star-inspired pieces for the dreamer in you.", "product_count": 5},
                {"title": "New Arrivals", "description": "The latest additions to our minimalist collection.", "product_count": 4}
            ],
            "pages": {
                "about": {"title": "Our Story", "content": "Lunara Studio was born from a belief that jewelry should whisper, not shout. Founded in 2023 by designer Mira Chen, every piece begins as a hand-drawn sketch in our Portland studio.\n\nWe source our materials from certified ethical suppliers, using recycled gold and conflict-free gemstones. Our packaging is 100% compostable because luxury shouldn't come at the planet's expense.\n\nEach Lunara piece is designed to be worn every day — in the boardroom, on the trail, and everywhere in between."},
                "contact": {"title": "Get in Touch", "email": "hello@lunarastudio.com", "phone": "+1 (503) 555-0142", "address": "821 NW Flanders St, Portland, OR 97209"},
                "faq": [
                    {"question": "What materials do you use?", "answer": "We use 14k gold-fill, sterling silver, and ethically sourced freshwater pearls."},
                    {"question": "Do you offer international shipping?", "answer": "Yes! We ship worldwide. Orders over $150 qualify for free international shipping."},
                    {"question": "What is your return policy?", "answer": "We offer 30-day returns on unworn items in original packaging."}
                ]
            },
            "social_media": {
                "instagram": "@lunarastudio",
                "twitter": "@lunarastudio",
                "facebook": "https://facebook.com/lunarastudio",
                "tiktok": "@lunarastudio",
                "pinterest": "@lunarastudio"
            },
            "footer": {
                "copyright": "© 2026 Lunara Studio. All rights reserved.",
                "links": ["Shipping Policy", "Returns", "Privacy Policy", "Terms of Service"],
                "newsletter_cta": "Join the Lunara circle — get 15% off your first order"
            },
            "seo": {
                "meta_title": "Lunara Studio | Minimalist Jewelry for the Modern Soul",
                "meta_description": "Discover handcrafted minimalist jewelry designed for everyday elegance. Ethically sourced, timeless pieces.",
                "keywords": ["minimalist jewelry", "handcrafted", "ethical jewelry", "gold necklace", "stackable rings"]
            }
        },
        "Fitness Tech": {
            "store_name": "VoltFit",
            "tagline": "Train smarter. Recover faster. Perform better.",
            "description": "VoltFit brings cutting-edge fitness technology to athletes and fitness enthusiasts. From smart resistance bands to AI-powered recovery tools, we bridge the gap between technology and peak performance.",
            "theme": {
                "primary_color": "#0D0D0D",
                "secondary_color": "#00E5FF",
                "accent_color": "#FF3366",
                "font_heading": "Outfit",
                "font_body": "Inter",
                "style": "bold"
            },
            "navbar": {
                "logo_text": "VOLTFIT",
                "links": ["Shop", "Technology", "Athletes", "Support", "Blog"]
            },
            "hero": {
                "headline": "Upgrade Your Training",
                "subheadline": "Smart fitness gear that adapts to your body and pushes your limits",
                "cta_text": "Shop Now"
            },
            "products": [
                {"title": "Volt Smart Resistance Band Pro", "description": "Bluetooth-connected resistance band with real-time tension tracking. Syncs with the VoltFit app.", "price": "129.99", "category": "Smart Equipment", "tags": ["bluetooth", "resistance", "tracking"], "variants": ["Light (15lb)", "Medium (30lb)", "Heavy (50lb)"]},
                {"title": "PulseWave Recovery Gun", "description": "Percussive therapy device with 6 speed settings and 4 interchangeable heads. Whisper-quiet motor.", "price": "199.99", "category": "Recovery", "tags": ["percussion", "recovery", "portable"], "variants": ["Matte Black", "Storm Gray"]},
                {"title": "NeuroGrip Smart Jump Rope", "description": "Digital jump rope with LCD counter, calorie tracker, and adjustable cable length.", "price": "49.99", "category": "Cardio", "tags": ["jump-rope", "digital", "cardio"], "variants": ["Black/Cyan", "Black/Red"]},
                {"title": "FlexTrack Yoga Mat", "description": "Smart yoga mat with embedded pressure sensors. Guides your poses through the companion app.", "price": "159.99", "category": "Smart Equipment", "tags": ["yoga", "smart", "guided"], "variants": ["Midnight Blue", "Forest Green"]},
                {"title": "HydroSync Smart Bottle", "description": "Insulated water bottle with hydration tracking and temperature display. 32oz capacity.", "price": "39.99", "category": "Accessories", "tags": ["hydration", "smart", "insulated"], "variants": ["Black", "White", "Cyan"]}
            ],
            "collections": [
                {"title": "Smart Training Gear", "description": "Connected equipment that tracks your progress and adapts to your performance.", "product_count": 6},
                {"title": "Recovery Essentials", "description": "Post-workout tools designed to reduce soreness and speed up muscle recovery.", "product_count": 4},
                {"title": "Best Sellers", "description": "Our most popular products loved by athletes worldwide.", "product_count": 5}
            ],
            "pages": {
                "about": {"title": "The VoltFit Mission", "content": "VoltFit was founded in 2024 by a team of sports engineers and professional athletes who were tired of 'dumb' fitness equipment.\n\nOur mission is simple: make every rep count. We embed smart sensors, Bluetooth connectivity, and AI algorithms into everyday fitness gear so you can train with precision.\n\nBacked by sports science research and trusted by over 10,000 athletes in 30+ countries, VoltFit is redefining what it means to work out smart."},
                "contact": {"title": "Contact Us", "email": "support@voltfit.com", "phone": "+1 (415) 555-0198", "address": "450 Townsend St, San Francisco, CA 94107"},
                "faq": [
                    {"question": "Is the VoltFit app free?", "answer": "Yes! The companion app is free on iOS and Android. Premium coaching features start at $9.99/month."},
                    {"question": "What is the warranty?", "answer": "All VoltFit products come with a 2-year limited warranty against manufacturing defects."},
                    {"question": "Do you ship internationally?", "answer": "Yes, we ship to 50+ countries. Standard international shipping takes 7-14 business days."}
                ]
            },
            "social_media": {
                "instagram": "@voltfit",
                "twitter": "@voltfit_official",
                "facebook": "https://facebook.com/voltfit",
                "tiktok": "@voltfit",
                "pinterest": "@voltfit"
            },
            "footer": {
                "copyright": "© 2026 VoltFit Inc. All rights reserved.",
                "links": ["Warranty", "Shipping", "Returns", "Privacy Policy"],
                "newsletter_cta": "Get 10% off + free training plan when you subscribe"
            },
            "seo": {
                "meta_title": "VoltFit | Smart Fitness Technology & Connected Training Gear",
                "meta_description": "Upgrade your workouts with smart fitness equipment. Bluetooth-connected, AI-powered gear for athletes.",
                "keywords": ["smart fitness", "connected gym equipment", "fitness tech", "recovery tools", "workout tracker"]
            }
        },
        "Organic Tea": {
            "store_name": "Verdant Leaf Co.",
            "tagline": "Sip mindfully. Live gently.",
            "description": "Verdant Leaf Co. sources single-origin organic teas from small family farms across Japan, China, and India. Every blend is crafted to bring a moment of calm to your busy day, with zero pesticides and fully compostable packaging.",
            "theme": {
                "primary_color": "#2D5016",
                "secondary_color": "#C8A96E",
                "accent_color": "#F4EDE4",
                "font_heading": "Playfair Display",
                "font_body": "Lato",
                "style": "elegant"
            },
            "navbar": {
                "logo_text": "VERDANT LEAF",
                "links": ["Shop Teas", "Our Farms", "Brewing Guide", "About", "Contact"]
            },
            "hero": {
                "headline": "Tea, Elevated",
                "subheadline": "Single-origin organic teas sourced directly from family farms around the world",
                "cta_text": "Discover Our Teas"
            },
            "products": [
                {"title": "Kyoto Morning Matcha", "description": "Ceremonial-grade matcha from Uji, Kyoto. Stone-ground for a creamy, umami-rich experience.", "price": "34.00", "category": "Matcha", "tags": ["matcha", "ceremonial", "japanese"], "variants": ["30g Tin", "80g Tin", "150g Bag"]},
                {"title": "Golden Yunnan Reserve", "description": "A smooth, malty black tea from Yunnan province. Rich golden tips with notes of honey and cocoa.", "price": "22.00", "category": "Black Tea", "tags": ["black-tea", "chinese", "malty"], "variants": ["50g", "100g", "200g"]},
                {"title": "Himalayan White Peony", "description": "A rare white tea from the Himalayan foothills. Delicate and sweet with floral notes.", "price": "28.00", "category": "White Tea", "tags": ["white-tea", "rare", "floral"], "variants": ["30g", "60g"]},
                {"title": "Jasmine Dragon Pearl", "description": "Hand-rolled green tea pearls scented with fresh jasmine blossoms. Unfurls beautifully in hot water.", "price": "26.00", "category": "Green Tea", "tags": ["green-tea", "jasmine", "hand-rolled"], "variants": ["50g", "100g", "200g"]},
                {"title": "Rooibos Chai Blend", "description": "Caffeine-free South African rooibos blended with cardamom, cinnamon, and ginger. Perfect evening cup.", "price": "18.00", "category": "Herbal", "tags": ["herbal", "caffeine-free", "chai"], "variants": ["50g", "100g"]}
            ],
            "collections": [
                {"title": "Single Origin", "description": "Pure, unblended teas from a single farm or region. Taste the terroir.", "product_count": 6},
                {"title": "Starter Sets", "description": "Curated sampler sets perfect for discovering your new favorite tea.", "product_count": 3},
                {"title": "Seasonal Picks", "description": "Limited harvest teas available only while supplies last.", "product_count": 4}
            ],
            "pages": {
                "about": {"title": "Our Story", "content": "Verdant Leaf Co. began with a single trip to a tea farm in Darjeeling. Founder Anika Patel fell in love with the craft, the culture, and the quiet intention behind every cup.\n\nWe partner directly with over 15 family farms across three continents, paying fair-trade prices and supporting regenerative agriculture practices.\n\nEvery package is plastic-free and fully compostable — because what's good for you should be good for the earth, too."},
                "contact": {"title": "Say Hello", "email": "hello@verdantleaf.co", "phone": "+1 (206) 555-0167", "address": "1422 Pike Place, Seattle, WA 98101"},
                "faq": [
                    {"question": "Are all your teas organic?", "answer": "Yes! Every tea we sell is USDA Certified Organic and sourced from farms that practice regenerative agriculture."},
                    {"question": "How should I store my tea?", "answer": "Keep tea in a cool, dark place in an airtight container. Our tins are perfect for this!"},
                    {"question": "Do you offer subscriptions?", "answer": "Yes! Our Tea Journey subscription delivers a curated selection monthly. Cancel anytime."}
                ]
            },
            "social_media": {
                "instagram": "@verdantleafco",
                "twitter": "@verdantleafco",
                "facebook": "https://facebook.com/verdantleafco",
                "tiktok": "@verdantleafco",
                "pinterest": "@verdantleafco"
            },
            "footer": {
                "copyright": "© 2026 Verdant Leaf Co. All rights reserved.",
                "links": ["Shipping", "Returns", "Brewing Guide", "Privacy Policy"],
                "newsletter_cta": "Join the leaf club — free sampler with your first order"
            },
            "seo": {
                "meta_title": "Verdant Leaf Co. | Organic Single-Origin Teas",
                "meta_description": "Discover premium organic teas sourced directly from family farms. Ethically sourced, beautifully packaged.",
                "keywords": ["organic tea", "single origin tea", "matcha", "loose leaf tea", "fair trade tea"]
            }
        }
    }

    # Return template-specific demo or a custom one
    if store_type in demos:
        return demos[store_type]

    # Default demo for custom prompts
    return {
        "store_name": f"Studio {prompt[:20].strip().title()}" if prompt else "Demo Store",
        "tagline": "Where creativity meets commerce",
        "description": f"A beautifully crafted store inspired by: {prompt}. This blueprint was generated in demo mode. Connect your Gemini API key for AI-powered generation.",
        **demos["Minimalist Jewelry"],  # Use jewelry store as base template
        "store_name": f"Studio {prompt[:20].strip().title()}" if prompt else "Demo Store",
    }
