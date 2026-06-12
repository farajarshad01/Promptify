# Promptify — AI Shopify Store Generator

Promptify is a full-stack AI application that generates complete Shopify store blueprints from a single text prompt. It uses Google Gemini AI to craft the store strategy and deployment logic, then integrates with the Shopify GraphQL API to deploy the store.

## ✨ Key Features

- **AI-Powered Generation**: Instantly create products, collections, and brand identity from a prompt.
- **Mandatory Authentication**: Secure JWT-based login and signup system.
- **Premium Dashboard**: Sidebar-based UI with a Sage Green aesthetic inspired by modern ERPs.
- **Real-time Status**: Track deployments (Draft, Deployed, Failed) with visual indicators and charts.
- **Store History**: Keep track of all your generated blueprints in a persistent database.
- **Demo Mode**: Robust mock infrastructure for testing without live API keys.

## 🚀 Tech Stack

- **Frontend**: React (Vite), Lucide Icons, Vanilla CSS (Premium Sage Theme).
- **Backend**: FastAPI, Uvicorn, Python.
- **AI**: Google Gemini Pro (via `google-genai`).
- **Database**: Supabase (PostgreSQL).
- **Deployment**: Shopify GraphQL API.

## 🛠️ Setup Instructions

### 1. Backend Setup
1. `cd backend`
2. Create a `.env` file from `.env.example`.
3. Install dependencies: `pip install -r requirements.txt`
4. Run server: `python main.py`

### 2. Frontend Setup
1. `cd frontend`
2. Install dependencies: `npm install`
3. Run dev server: `npm run dev`

### 3. Database Setup
Run the SQL provided in `setup.sql` in your Supabase SQL Editor.

---

*Build with ❤️ for FYP 2026*
