# Pairwise — Two-Source Dating Agents

A React + FastAPI prototype demonstrating a multi-agent matchmaking workflow.

## Project overview
Each consenting participant is represented by an agent. The agent profile is based only on the participant's public LinkedIn and public Instagram profiles, represented in this prototype by two separately entered source-note fields. The application does not scrape either platform and does not query other sources.

## Features
- Add and delete participants
- Store exactly two source URLs per participant (LinkedIn and Instagram)
- Keep notes for each source separate
- Generate an evidence-oriented profile from the supplied notes
- Rank each participant against the other participants using shared-interest overlap
- Show explanations, source links, and limitations

## Tech stack
- React + Vite
- FastAPI + Python
- SQLAlchemy + SQLite

## Local setup

### Backend
```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
API docs: http://127.0.0.1:8000/docs

### Frontend (new terminal)
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173.

## Deploy a public demo on Render

This repository has two parts, so create two Render services after pushing it to GitHub.

### 1. Backend API
- Create a **Web Service** and select this repository.
- Root Directory: `backend`
- Runtime: `Python`
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- After deployment, copy the backend URL, e.g. `https://your-api-name.onrender.com`.

### 2. Frontend
- Create a **Static Site** and select this repository.
- Root Directory: `frontend`
- Build Command: `npm install && npm run build`
- Publish Directory: `dist`
- Environment Variable: `VITE_API_URL` = your deployed backend base URL, without `/api` at the end.
- Deploy. The resulting Render static-site URL is your live website.
- For a production deployment, change the backend CORS allowlist to the exact frontend domain instead of `*`.

### Important hosting limitation
The demo currently uses SQLite. On many free web-hosting setups, local files may not persist across redeploys or service restarts. Use a managed PostgreSQL database or a persistent disk before treating this as a reliable public service. Free backend services may sleep when inactive.

## YouTube demo video
Record a screen walkthrough of:
1. Project goal and the two-source-only rule.
2. Adding a consenting participant and entering their LinkedIn and Instagram URLs.
3. Showing separate source notes and the profile evidence.
4. Opening the agent profile page.
5. Generating the ranking and explaining the score.
6. Mentioning the current limitation: keyword-based ranking, not a fully autonomous LLM agent.

Do not claim that the app scrapes LinkedIn/Instagram, has 25 real participants, uses autonomous LLMs, or is production-ready unless you have actually implemented and verified those things.

## Privacy and ethical use
- Only include participants who have agreed to take part.
- Use public, non-sensitive details only.
- Do not infer sensitive traits or private dating preferences.
- Public profile visibility is not consent to be included in a dating experiment.
- Compatibility scores are illustrative estimates, not facts.
- Provide deletion and consent withdrawal in any real deployment.

## Current implementation status
This is a prototype. It has a basic profile extractor and a transparent shared-interest ranking algorithm. It does not yet use an LLM for independent agent reasoning and does not automatically fetch social-media pages.
