# RoastMyPitch 

> **Top 5 / 100+ teams — AGENTATHONX Hackathon**

An AI-powered startup pitch evaluator where your idea gets torn apart — and defended — by three specialized AI agents in a live debate.

## What Is RoastMyPitch?

Most feedback tools give you one perspective. RoastMyPitch gives you three, simultaneously, in real time.

You submit your startup idea. Three AI agents immediately go to work:

-  **Devil's Advocate** — attacks your idea, finds every weakness and market risk
-  **Supporter** — defends your idea, surfaces opportunities and growth angles
-  **Analyst** — synthesizes both sides into a final fundability verdict

The result: a multi-perspective evaluation that mirrors what actually happens in an investor meeting.

## Features

- **Live multi-agent debate** — all 3 agents respond in real time via SSE streaming
- **LangGraph orchestration** — agents run as a stateful graph with memory and turn management
- **Fundability score** — Analyst delivers a structured verdict with strengths, weaknesses, and investor readiness
- **Auth + history** — user accounts with saved pitch history via SQLite
- **Text-to-speech** — agent responses voiced via Google Gemini TTS

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS 4, Framer Motion |
| Backend | FastAPI, Uvicorn, Pydantic |
| AI / Agents | LangGraph, Groq API (llama-3.3-70b-versatile) |
| TTS | Google Gemini SDK |
| Database | SQLite (auth + pitch history) |
| Streaming | Server-Sent Events (SSE) |

## Run Locally

### Prerequisites

- Python 3.10+
- Node.js 18+
- A [Groq API key](https://console.groq.com) (free)
- A [Google Gemini API key](https://aistudio.google.com) (free)

### Backend

```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file inside `backend/`:

```
GROQ_API_KEY=your_groq_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

Start the server:

```bash
uvicorn main:app --reload
```

Backend runs at `http://localhost:8000`

### Frontend

```bash
cd RoastMyPitch
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

## How It Works

```
User submits pitch
       ↓
LangGraph state machine initializes
       ↓
Devil's Advocate → Supporter → Analyst
       ↓               ↓           ↓
    (streamed live via SSE to React UI)
       ↓
Final fundability verdict
```

## Project Structure

```
RoastMyPitch/
├── backend/
│   ├── main.py              # FastAPI routes + SSE streaming
│   ├── graph.py             # LangGraph agent definitions
│   ├── auth_db.py           # SQLite auth + pitch history
│   ├── requirements.txt
│   └── .env                 # API keys (never commit this)
│
├── src/
│   ├── App.tsx              # Main app + auth flow
│   ├── services/
│   │   └── geminiService.ts # Gemini TTS + text helper
│   └── components/          # UI components
│
├── vite.config.ts
└── README.md
```

## Environment Variables

| Variable | Location | Description |
|---|---|---|
| `GROQ_API_KEY` | `backend/.env` | Your Groq API key |
| `GEMINI_API_KEY` | `backend/.env` | Your Google Gemini API key |

Never commit your `.env` file. It's already in `.gitignore`.

## Built At

**AGENTATHONX** — 24-hour hackathon, Top 5 finish out of 100+ teams.  
Solo AI/ML backend. Full LangGraph agent pipeline built and shipped in one session.
