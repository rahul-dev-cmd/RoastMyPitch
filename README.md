# RoastMyPitch

> Top 5 / 100+ teams - AGENTATHONX Hackathon

An AI-powered startup pitch evaluator where your idea gets torn apart and defended by three specialized AI agents in a live debate.

## What Is RoastMyPitch?

Most feedback tools give you one perspective. RoastMyPitch gives you three, simultaneously, in real time.

You submit your startup idea. Three AI agents immediately go to work:

- Devil's Advocate - attacks your idea, finds every weakness and market risk
- Supporter - defends your idea, surfaces opportunities and growth angles
- Analyst - synthesizes both sides into a final fundability verdict

The result is a multi-perspective evaluation that mirrors what actually happens in an investor meeting.

## Features

- Live multi-agent debate via SSE streaming
- LangGraph orchestration with memory and turn management
- Fundability score from the Analyst agent
- Auth and history backed by SQLite

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS 4, Motion |
| Backend | FastAPI, Uvicorn, Pydantic |
| AI / Agents | LangGraph, Groq API (`llama-3.3-70b-versatile`) |
| Database | SQLite |
| Streaming | Server-Sent Events (SSE) |

## Run Locally

### Prerequisites

- Python 3.10+
- Node.js 18+
- A Groq API key

### Backend

```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file inside `backend/`:

```env
GROQ_API_KEY=your_groq_api_key_here
```

Start the server:

```bash
uvicorn main:app --reload
```

Backend runs at `http://localhost:8000`

### Frontend

```bash
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`

## Project Structure

```text
RoastMyPitch/
|-- backend/
|   |-- main.py
|   |-- graph.py
|   |-- auth_db.py
|   |-- requirements.txt
|   `-- .env
|-- src/
|   |-- App.tsx
|   `-- utils/
|       `-- debate.ts
|-- vite.config.ts
`-- README.md
```

## Environment Variables

| Variable | Location | Description |
|---|---|---|
| `GROQ_API_KEY` | `backend/.env` | Your Groq API key |

Never commit your `.env` file. It's already in `.gitignore`.
