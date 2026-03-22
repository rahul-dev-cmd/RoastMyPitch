import sqlite3
import hashlib
import os

DB_PATH = 'auth.db'

def get_db_connection():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            uid TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            display_name TEXT NOT NULL,
            password_hash TEXT NOT NULL
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS pitches (
            id TEXT PRIMARY KEY,
            uid TEXT NOT NULL,
            idea TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (uid) REFERENCES users (uid)
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pitch_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (pitch_id) REFERENCES pitches (id)
        )
    ''')
    conn.commit()
    conn.close()

def hash_password(password: str) -> str:
    # A simple SHA-256 hash for local testing purposes. 
    # In a real production app, bcrypt or argon2 should be used.
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def register_user(email: str, display_name: str, password: str):
    conn = get_db_connection()
    c = conn.cursor()
    
    # Generate simple unique ID
    uid = 'local-' + os.urandom(8).hex()
    hashed_pw = hash_password(password)
    
    try:
        c.execute(
            'INSERT INTO users (uid, email, display_name, password_hash) VALUES (?, ?, ?, ?)',
            (uid, email.lower().strip(), display_name.strip(), hashed_pw)
        )
        conn.commit()
        return {"uid": uid, "email": email, "displayName": display_name}
    except sqlite3.IntegrityError:
        return None # Email already exists
    finally:
        conn.close()

def login_user(email: str, password: str):
    conn = get_db_connection()
    c = conn.cursor()
    
    hashed_pw = hash_password(password)
    c.execute(
        'SELECT uid, email, display_name FROM users WHERE email=? AND password_hash=?',
        (email.lower().strip(), hashed_pw)
    )
    user = c.fetchone()
    conn.close()
    
    if user:
        return {"uid": user["uid"], "email": user["email"], "displayName": user["display_name"]}
    return None

def save_pitch_interaction(user_id: str, pitch_id: str, idea: str, messages: list):
    """Save or update a pitch session and its messages."""
    if not user_id: return
    conn = get_db_connection()
    c = conn.cursor()
    
    # Insert pitch if it doesn't exist
    c.execute('INSERT OR IGNORE INTO pitches (id, uid, idea) VALUES (?, ?, ?)', (pitch_id, user_id, idea))
    
    # Insert new messages
    for msg in messages:
        c.execute(
            'INSERT INTO messages (pitch_id, role, content) VALUES (?, ?, ?)',
            (pitch_id, msg.get("role"), msg.get("content"))
        )
    conn.commit()
    conn.close()

def get_user_history(user_id: str):
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('SELECT id, idea, timestamp FROM pitches WHERE uid=? ORDER BY timestamp DESC', (user_id,))
    pitches = c.fetchall()
    
    history = []
    for p in pitches:
        c.execute('SELECT role, content FROM messages WHERE pitch_id=? ORDER BY id ASC', (p["id"],))
        messages = c.fetchall()
        history.append({
            "id": p["id"],
            "idea": p["idea"],
            "timestamp": p["timestamp"],
            "messages": [{"role": m["role"], "content": m["content"]} for m in messages]
        })
    conn.close()
    return history

def get_all_users():
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('SELECT uid, email, display_name FROM users ORDER BY display_name ASC')
    users = [{"uid": r["uid"], "email": r["email"], "displayName": r["display_name"]} for r in c.fetchall()]
    conn.close()
    return users

def get_all_platform_history():
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('''
        SELECT p.id, p.idea, p.timestamp, u.email, u.display_name 
        FROM pitches p 
        JOIN users u ON p.uid = u.uid 
        ORDER BY p.timestamp DESC
    ''')
    pitches = c.fetchall()
    
    history = []
    for p in pitches:
        c.execute('SELECT role, content FROM messages WHERE pitch_id=? ORDER BY id ASC', (p["id"],))
        messages = c.fetchall()
        history.append({
            "id": p["id"],
            "user_email": p["email"],
            "user_name": p["display_name"],
            "idea": p["idea"],
            "timestamp": p["timestamp"],
            "messages": [{"role": m["role"], "content": m["content"]} for m in messages]
        })
    conn.close()
    return history
