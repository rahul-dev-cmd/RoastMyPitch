from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict
import json
import traceback
import asyncio
from dotenv import load_dotenv
from graph import debate_graph, DebateState
from auth_db import init_db, register_user, login_user, save_pitch_interaction, get_user_history, get_all_users, get_all_platform_history, get_db_connection
from fastapi import HTTPException

load_dotenv()

# Initialize local SQLite DB for auth
init_db()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session store — good enough for hackathon
sessions: Dict[str, List[Dict]] = {}

class StartRequest(BaseModel):
    session_id: str
    idea: str
    uid: str | None = None

class ReplyRequest(BaseModel):
    session_id: str
    message: str
    uid: str | None = None

class AuthRequest(BaseModel):
    email: str
    password: str
    displayName: str = ""

def run_debate(session_id: str, user_message: str, idea: str):
    """Run all 3 agents and yield results as SSE events."""

    # Build message history
    if session_id not in sessions:
        sessions[session_id] = []

    sessions[session_id].append({
        "role": "user",
        "content": f"Startup idea: {idea}\n\nFounder says: {user_message}" if not sessions[session_id] else user_message
    })

    state: DebateState = {
        "idea": idea,
        "messages": sessions[session_id],
        "devil_response": "",
        "supporter_response": "",
        "analyst_response": "",
        "round": len([m for m in sessions[session_id] if m["role"] == "user"]),
    }

    result = debate_graph.invoke(state)

    # Save agent responses to history
    sessions[session_id].append({
        "role": "assistant",
        "content": f"[Devil's Advocate]: {result['devil_response']}\n[Supporter]: {result['supporter_response']}\n[Analyst]: {result['analyst_response']}"
    })

    return result

@app.post("/start")
async def start_debate(req: StartRequest):
    """First message — founder submits their idea."""
    async def stream():
        try:
            result = await asyncio.to_thread(
                run_debate, req.session_id, req.idea, req.idea
            )
            yield f"data: {json.dumps({'agent': 'devil', 'content': result['devil_response']})}\n\n"
            await asyncio.sleep(0.1)
            yield f"data: {json.dumps({'agent': 'supporter', 'content': result['supporter_response']})}\n\n"
            await asyncio.sleep(0.1)
            yield f"data: {json.dumps({'agent': 'analyst', 'content': result['analyst_response']})}\n\n"
            
            # Save to DB if logged in
            if getattr(req, 'uid', None):
                messages_to_save = [
                    {"role": "user", "content": req.idea},
                    {"role": "ROASTER", "content": result['devil_response']},
                    {"role": "DEFENDER", "content": result['supporter_response']},
                    {"role": "JUDGE", "content": result['analyst_response']}
                ]
                save_pitch_interaction(req.uid, req.session_id, req.idea, messages_to_save)
                
            yield f"data: {json.dumps({'agent': 'done'})}\n\n"
        except Exception as e:
            error_msg = f"{type(e).__name__}: {str(e)}"
            print(f"ERROR in /start stream: {error_msg}")
            traceback.print_exc()
            yield f"data: {json.dumps({'agent': 'error', 'content': error_msg})}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")

@app.post("/reply")
async def reply_to_debate(req: ReplyRequest):
    """Founder pushes back — agents respond to their defence."""
    # Retrieve idea from session history
    history = sessions.get(req.session_id, [])
    idea = history[0]["content"].replace("Startup idea: ", "").split("\n")[0] if history else ""

    async def stream():
        try:
            result = await asyncio.to_thread(
                run_debate, req.session_id, req.message, idea
            )
            yield f"data: {json.dumps({'agent': 'devil', 'content': result['devil_response']})}\n\n"
            await asyncio.sleep(0.1)
            yield f"data: {json.dumps({'agent': 'supporter', 'content': result['supporter_response']})}\n\n"
            await asyncio.sleep(0.1)
            yield f"data: {json.dumps({'agent': 'analyst', 'content': result['analyst_response']})}\n\n"
            
            # Save to DB if logged in
            if getattr(req, 'uid', None):
                messages_to_save = [
                    {"role": "user", "content": req.message},
                    {"role": "ROASTER", "content": result['devil_response']},
                    {"role": "DEFENDER", "content": result['supporter_response']},
                    {"role": "JUDGE", "content": result['analyst_response']}
                ]
                save_pitch_interaction(req.uid, req.session_id, idea, messages_to_save)

            yield f"data: {json.dumps({'agent': 'done'})}\n\n"
        except Exception as e:
            error_msg = f"{type(e).__name__}: {str(e)}"
            print(f"ERROR in /reply stream: {error_msg}")
            traceback.print_exc()
            yield f"data: {json.dumps({'agent': 'error', 'content': error_msg})}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/auth/register")
def register(req: AuthRequest):
    if not req.email or not req.password or not req.displayName:
        raise HTTPException(status_code=400, detail="Missing fields")
    user = register_user(req.email, req.displayName, req.password)
    if not user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return user

@app.post("/auth/login")
def login(req: AuthRequest):
    if not req.email or not req.password:
        raise HTTPException(status_code=400, detail="Missing fields")
    user = login_user(req.email, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return user

@app.get("/api/history/{uid}")
def history(uid: str):
    return get_user_history(uid)

@app.get("/api/admin/users")
def admin_users(uid: str):
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('SELECT email FROM users WHERE uid=?', (uid,))
    user = c.fetchone()
    conn.close()
    if not user or user["email"] != 'kumari.nikita121002@gmail.com':
        raise HTTPException(status_code=403, detail="Forbidden")
    return get_all_users()

@app.get("/api/admin/history")
def admin_history(uid: str):
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('SELECT email FROM users WHERE uid=?', (uid,))
    user = c.fetchone()
    conn.close()
    if not user or user["email"] != 'kumari.nikita121002@gmail.com':
        raise HTTPException(status_code=403, detail="Forbidden")
    return get_all_platform_history()