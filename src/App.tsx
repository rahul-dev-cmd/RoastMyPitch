import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { Flame, Shield, Scale, ArrowRight, RefreshCcw, User, Info, Mail, LogIn, LogOut, Github, Twitter, Linkedin, Facebook, MapPin, Phone, Volume2, VolumeX, Cpu, Zap, Activity } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AgentRole, Message, DebateState } from './types';
import { AGENTS } from './constants';
import { getAgentResponse, extractScore, generateSpeech } from './services/geminiService';
import bgVideo from './assets/Transition_between_energy_202603211538.mp4';

interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ScrollLetter = ({ letter, progress, index, total }: { letter: string, progress: any, index: number, total: number }) => {
  const start = index / total;
  const end = start + (2 / total);
  const opacity = useTransform(progress, [start, Math.min(end, 1)], [0.1, 1]);
  return <motion.span style={{ opacity }}>{letter}</motion.span>;
};

function ScrollText({ text }: { text: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 80%", "end 50%"]
  });
  
  const words = text.split(" ");
  const totalLetters = text.replace(/ /g, "").length;
  let letterIndex = 0;

  return (
    <div ref={containerRef} className="text-2xl font-serif italic text-white font-bold leading-relaxed flex flex-wrap gap-x-[0.25em] gap-y-2">
      {words.map((word, wIdx) => (
        <span key={wIdx} className="whitespace-nowrap flex">
          {word.split("").map((letter, cIdx) => (
            <ScrollLetter 
              key={cIdx} 
              letter={letter} 
              progress={scrollYProgress} 
              index={letterIndex++} 
              total={totalLetters} 
            />
          ))}
        </span>
      ))}
    </div>
  );
}

export default function App() {
  const { scrollYProgress: mainScrollProgress } = useScroll();
  const [user, setUser] = useState<AppUser | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminPitches, setAdminPitches] = useState<any[]>([]);
  const [adminTab, setAdminTab] = useState<'users' | 'pitches'>('users');

  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');

  const [state, setState] = useState<DebateState>({
    pitch: '',
    messages: [],
    score: 0,
    isDebating: false,
    currentSpeaker: null,
  });
  const [userInput, setUserInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const goalRef = useRef<HTMLElement>(null);
  const servicesRef = useRef<HTMLElement>(null);
  const howItWorksRef = useRef<HTMLElement>(null);
  const contactRef = useRef<HTMLElement>(null);

  // Rehydrate user from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (err) {
        console.error("Failed to parse local user", err);
      }
    }
  }, []);

  const handleAuthSubmit = async () => {
    setLoginError(null);
    if (!authEmail || !authPassword || (authMode === 'register' && !authName)) {
      setLoginError("Please fill out all fields.");
      return;
    }
    
    try {
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
      const body = {
        email: authEmail,
        password: authPassword,
        displayName: authMode === 'register' ? authName : "",
      };

      const res = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Authentication failed");
      }

      const userData = await res.json();
      userData.photoURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.displayName)}&background=003366&color=fff`;
      
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      setShowAuthModal(false);
      setAuthPassword('');
    } catch (error: any) {
      console.error("Auth error:", error);
      setLoginError(error.message);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    setHistoryData([]);
  };

  const fetchHistory = async () => {
    if (!user?.uid) return;
    try {
      const res = await fetch(`http://localhost:8000/api/history/${user.uid}`);
      if (res.ok) {
        const data = await res.json();
        setHistoryData(data);
      }
    } catch (err) {
      console.error("Failed to fetch history", err);
    }
  };

  const fetchAdminData = async () => {
    if (user?.email !== 'kumari.nikita121002@gmail.com') return;
    try {
      const resUsers = await fetch(`http://localhost:8000/api/admin/users?uid=${user.uid}`);
      if (resUsers.ok) setAdminUsers(await resUsers.json());
      const resPitches = await fetch(`http://localhost:8000/api/admin/history?uid=${user.uid}`);
      if (resPitches.ok) setAdminPitches(await resPitches.json());
    } catch (err) {
      console.error("Failed to fetch admin data", err);
    }
  };

  const restoreHistoryPitch = (item: any) => {
    setState({
      pitch: item.idea,
      messages: item.messages.map((m: any) => ({
        id: Math.random().toString(),
        role: m.role,
        content: m.content,
        timestamp: new Date(item.timestamp).getTime()
      })),
      score: extractScore(item.messages[item.messages.length - 1]?.content || ""),
      isDebating: true,
      currentSpeaker: 'USER'
    });
    setShowHistoryModal(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (ref: React.RefObject<HTMLElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleNavClick = (ref?: React.RefObject<HTMLElement>) => {
    if (state.isDebating) {
      resetDebate();
      setTimeout(() => {
        if (ref && ref.current) scrollToSection(ref);
        else window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    } else {
      if (ref && ref.current) scrollToSection(ref);
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [state.messages, isThinking]);

  const sessionRef = useRef(Math.random().toString(36).substring(7));

  // Debate sequence logic using backend Server-Sent Events
  const streamDebate = async (endpoint: '/start' | '/reply', payload: any) => {
    setIsThinking(true);
    setState(prev => ({ ...prev, currentSpeaker: null })); // Disable input during stream

    try {
      const response = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.body) return;
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.substring(6);
            try {
              const data = JSON.parse(dataStr);
              if (data.agent === 'done') {
                setIsThinking(false);
                setState(prev => ({ ...prev, currentSpeaker: 'USER' }));
              } else {
                const roleMap: Record<string, AgentRole> = { 
                  devil: 'ROASTER', supporter: 'DEFENDER', analyst: 'JUDGE' 
                };
                const role = roleMap[data.agent];
                if (!role) continue;

                const newScore = extractScore(data.content);
                const newMessage: Message = {
                  id: Math.random().toString(36).substring(7),
                  role,
                  content: data.content,
                  timestamp: Date.now(),
                };

                setState(prev => ({
                  ...prev,
                  messages: [...prev.messages, newMessage],
                  score: newScore !== null ? newScore : prev.score,
                }));

                // Voice generation
                if (voiceEnabled) {
                  generateSpeech(data.content, role).then(base64Audio => {
                    if (base64Audio) playAudio(base64Audio);
                  });
                }
              }
            } catch (err) {
              console.error("Error parsing SSE data line", err);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error streaming debate:", error);
      setIsThinking(false);
      setState(prev => ({ ...prev, currentSpeaker: 'USER' }));
    }
  };

  const playAudio = async (base64: string) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const binaryString = window.atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const audioBuffer = await ctx.decodeAudioData(bytes.buffer);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start(0);
    } catch (err) {
      console.error("Audio playback error:", err);
    }
  };

  const getNextSpeaker = (current: AgentRole): AgentRole | 'USER' | null => {
    if (current === 'ROASTER') return 'USER';
    if (current === 'DEFENDER') return 'JUDGE';
    if (current === 'JUDGE') return 'USER';
    return null;
  };

  const startDebate = () => {
    if (!state.pitch.trim()) return;
    sessionRef.current = Math.random().toString(36).substring(7); // New session
    setState(prev => ({
      ...prev,
      isDebating: true,
      messages: [],
      score: 0,
      currentSpeaker: null, // We'll wait for the stream to finish before setting to USER
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    streamDebate('/start', {
      session_id: sessionRef.current,
      idea: state.pitch,
      uid: user?.uid
    });
  };

  const handleUserReply = () => {
    if (!userInput.trim()) return;
    
    const userMessage: Message = {
      id: Math.random().toString(36).substring(7),
      role: 'USER',
      content: userInput,
      timestamp: Date.now(),
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      currentSpeaker: null,
    }));
    setUserInput('');

    streamDebate('/reply', {
      session_id: sessionRef.current,
      message: userInput,
      uid: user?.uid
    });
  };

  const resetDebate = () => {
    setState({
      pitch: '',
      messages: [],
      score: 0,
      isDebating: false,
      currentSpeaker: null,
    });
  };

  return (
    <div className="min-h-screen flex flex-col hero-bg relative text-white">
      {/* Background Video */}
      <div className="fixed inset-0 -z-10 w-full h-full overflow-hidden">
        <video 
          autoPlay 
          loop 
          muted 
          playsInline
          className="absolute inset-0 w-full h-full object-cover animate-slow-pan"
        >
          <source src={bgVideo} type="video/mp4" />
        </video>
      </div>

      {/* Floating Nav */}
      <nav className="fixed top-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-6xl px-4">
        <div className="bg-blue-900/30 backdrop-blur-xl text-white px-8 py-3 rounded-full flex items-center justify-between text-sm font-medium border border-blue-400/30 shadow-2xl">
          <div className="flex items-center gap-8">
            <span 
              onClick={() => handleNavClick()}
              className="serif-display text-xl tracking-tight cursor-pointer hover:text-blue-400 transition-colors"
            >
              Roast My Pitch
            </span>
            <div className="hidden md:flex items-center gap-6">
              <span 
                onClick={() => handleNavClick(goalRef)}
                className="text-white/80 hover:text-white font-bold cursor-pointer transition-opacity flex items-center gap-1"
              >
                About
              </span>
              <span 
                onClick={() => handleNavClick(servicesRef)}
                className="text-white/80 hover:text-white font-bold cursor-pointer transition-opacity flex items-center gap-1"
              >
                Services
              </span>
              <span 
                onClick={() => handleNavClick(howItWorksRef)}
                className="text-white/80 hover:text-white font-bold cursor-pointer transition-opacity flex items-center gap-1"
              >
                Process
              </span>
              <span 
                onClick={() => handleNavClick(contactRef)}
                className="text-white/80 hover:text-white font-bold cursor-pointer transition-opacity flex items-center gap-1"
              >
                Contact
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                {user.email === 'kumari.nikita121002@gmail.com' && (
                  <button 
                    onClick={() => { setShowAdminModal(true); fetchAdminData(); }}
                    className="bg-red-900/40 hover:bg-red-600 px-4 py-1.5 rounded-full text-xs font-bold transition-all border border-red-500/30 text-red-100"
                  >
                    Admin Portal
                  </button>
                )}
                <button 
                  onClick={() => { setShowHistoryModal(true); fetchHistory(); }}
                  className="bg-white/10 hover:bg-white/20 px-4 py-1.5 rounded-full text-xs font-bold transition-all border border-blue-400/20"
                >
                  History
                </button>
                <span className="text-xs opacity-60 hidden sm:block">{user.displayName}</span>
                <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full border border-blue-400/40" />
                <button onClick={handleLogout} className="text-white/80 hover:text-white font-bold transition-opacity p-2">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowAuthModal(true)}
                  className="text-white/80 hover:text-white font-bold px-4 py-2 transition-all"
                >
                  Log In
                </button>
                <button 
                  onClick={() => setShowAuthModal(true)}
                  className="bg-[#003366] hover:bg-[#004488] px-6 py-2 rounded-full text-xs font-bold transition-all shadow-[0_0_20px_rgba(0,51,102,0.4)] border border-blue-400/30"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="glass-card p-8 rounded-[32px] max-w-md w-full text-center space-y-8"
            >
              <div className="space-y-2">
                <h2 className="serif-display text-4xl text-white">Access the Fire</h2>
                <p className="text-white/80 font-medium text-sm">Sign in to save your pitches, track your scores, and refine your vision.</p>
              </div>
              <div className="space-y-4">
                <div className="flex bg-black/50 rounded-xl p-1 mb-6 border border-blue-400/20">
                  <button
                    onClick={() => { setAuthMode('login'); setLoginError(null); }}
                    className={cn("flex-1 py-2 text-sm font-bold rounded-lg transition-colors", authMode === 'login' ? "bg-blue-600 text-white" : "text-white/60 hover:text-white")}
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => { setAuthMode('register'); setLoginError(null); }}
                    className={cn("flex-1 py-2 text-sm font-bold rounded-lg transition-colors", authMode === 'register' ? "bg-blue-600 text-white" : "text-white/60 hover:text-white")}
                  >
                    Register
                  </button>
                </div>

                <div className="space-y-3 text-left">
                  {authMode === 'register' && (
                    <div>
                      <label className="text-xs uppercase tracking-widest text-blue-400 font-bold ml-1">Display Name</label>
                      <input 
                        type="text" 
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        placeholder="Startup Founder"
                        className="w-full mt-1 bg-black/50 border border-blue-400/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-xs uppercase tracking-widest text-blue-400 font-bold ml-1">Email</label>
                    <input 
                      type="email" 
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAuthSubmit()}
                      placeholder="founder@startup.com"
                      className="w-full mt-1 bg-black/50 border border-blue-400/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-widest text-blue-400 font-bold ml-1">Password</label>
                    <input 
                      type="password" 
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAuthSubmit()}
                      placeholder="••••••••"
                      className="w-full mt-1 bg-black/50 border border-blue-400/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleAuthSubmit}
                  className="w-full bg-[#003366] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-[#004488] transition-all shadow-[0_0_30px_rgba(0,51,102,0.3)] border border-blue-400/30 mt-6"
                >
                  {authMode === 'login' ? 'Log In to Account' : 'Create Free Account'}
                </button>

                {loginError && (
                  <div className="text-red-400 text-sm font-medium bg-red-400/10 p-3 rounded-xl border border-red-400/20 text-balance leading-relaxed">
                    ERROR: {loginError}
                  </div>
                )}
              </div>
              <button 
                onClick={() => setShowAuthModal(false)}
                className="text-white/60 font-medium hover:text-white/80 font-medium text-xs uppercase tracking-widest font-bold transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* History Modal */}
        {showHistoryModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowHistoryModal(false); }}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="glass-card p-8 rounded-[32px] max-w-2xl w-full max-h-[80vh] overflow-y-auto space-y-6 scrollbar-hide"
            >
              <div className="flex justify-between items-center">
                <h2 className="serif-display text-3xl text-white">Your Past Pitches</h2>
                <button onClick={() => setShowHistoryModal(false)} className="text-white/50 hover:text-white transition-colors cursor-pointer p-2">✕</button>
              </div>
              
              <div className="space-y-4">
                {historyData.length === 0 ? (
                  <div className="text-center text-white/50 py-10 font-medium">No pitches saved yet. Log in and start roasting!</div>
                ) : (
                  historyData.map((item) => (
                    <div 
                      key={item.id} 
                      className="bg-black/40 border border-blue-400/20 rounded-2xl p-5 hover:border-blue-500/50 hover:bg-blue-900/10 transition-all group cursor-pointer"
                      onClick={() => restoreHistoryPitch(item)}
                    >
                      <p className="text-white/90 font-medium mb-3 line-clamp-2">{item.idea}</p>
                      <div className="flex justify-between items-center text-xs text-white/50 font-medium">
                        <span>{new Date(item.timestamp).toLocaleDateString()} at {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        <span className="bg-blue-900/40 text-blue-400 px-3 py-1.5 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          {item.messages.length} interactions
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Admin Modal */}
        {showAdminModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowAdminModal(false); }}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-zinc-900 border border-red-500/30 p-8 rounded-[32px] max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col space-y-6 shadow-[0_0_100px_rgba(220,38,38,0.15)]"
            >
              <div className="flex justify-between items-center shrink-0">
                <h2 className="serif-display text-3xl text-red-400 font-bold">Creator Dashboard</h2>
                <button onClick={() => setShowAdminModal(false)} className="text-white/50 hover:text-white transition-colors cursor-pointer p-2">✕</button>
              </div>
              
              <div className="flex bg-black/50 rounded-xl p-1 border border-zinc-800 shrink-0">
                <button
                  onClick={() => setAdminTab('users')}
                  className={cn("flex-1 py-3 text-sm font-bold rounded-lg transition-colors", adminTab === 'users' ? "bg-red-900 text-red-100" : "text-white/60 hover:text-white")}
                >
                  Registered Users ({adminUsers.length})
                </button>
                <button
                  onClick={() => setAdminTab('pitches')}
                  className={cn("flex-1 py-3 text-sm font-bold rounded-lg transition-colors", adminTab === 'pitches' ? "bg-red-900 text-red-100" : "text-white/60 hover:text-white")}
                >
                  Global Platform Activity ({adminPitches.length})
                </button>
              </div>

              <div className="overflow-y-auto space-y-4 pr-2 scrollbar-hide flex-1">
                {adminTab === 'users' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {adminUsers.map(u => (
                      <div key={u.uid} className="bg-black/40 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4">
                        <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName)}&background=18181b&color=ef4444`} className="w-10 h-10 rounded-full border border-red-500/30" alt=""/>
                        <div>
                          <p className="font-bold text-white text-sm">{u.displayName}</p>
                          <p className="text-xs text-zinc-400">{u.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {adminTab === 'pitches' && (
                  <div className="space-y-4">
                    {adminPitches.map((p: any) => (
                      <div key={p.id} className="bg-black/40 border border-zinc-800 rounded-2xl p-5 hover:border-red-500/30 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                             <span className="text-xs font-bold text-red-400 bg-red-950/50 px-2 py-1 rounded-md">{p.user_name}</span>
                             <span className="text-xs text-zinc-500">{p.user_email}</span>
                          </div>
                          <span className="text-xs text-zinc-500">{new Date(p.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-zinc-200 text-sm font-medium mb-4 pl-2 border-l-2 border-red-500/20 leading-relaxed">{p.idea}</p>
                        <div className="space-y-3 bg-black/60 p-4 rounded-xl max-h-[200px] overflow-y-auto scrollbar-hide">
                           {p.messages.map((m: any, idx: number) => (
                              <div key={idx} className={cn("text-xs p-3 rounded-lg flex gap-2", m.role === 'user' ? "bg-zinc-800/50 text-white ml-8" : "bg-red-950/20 text-red-100/80 mr-8")}>
                                <span className="font-bold uppercase tracking-wide opacity-50 shrink-0">{m.role}:</span>
                                <span className={cn("line-clamp-3", m.role !== 'user' && "opacity-80")}>{m.content}</span>
                              </div>
                           ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col items-center px-4 pt-24 pb-12">
        <AnimatePresence mode="wait">
          {!state.isDebating ? (
            <motion.div 
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-6xl flex flex-col items-center"
            >
              {/* Hero Section */}
              <div className="min-h-screen flex flex-col items-center justify-center text-center space-y-12 w-full relative">
                <div className="absolute left-8 top-1/2 -translate-y-1/2 hidden xl:block">
                  <div className="vertical-rail">ESTABLISHED 2026 • AI DRIVEN VENTURE ANALYSIS</div>
                </div>
                
                <div className="space-y-0 relative z-10">
                  <motion.h1 
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="big-display text-white blue-glow"
                  >
                    ROAST<br />MY PITCH
                  </motion.h1>
                </div>

                <motion.div 
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="relative w-full max-w-3xl mx-auto group z-10"
                >
                  <div className="flex items-center gap-4 p-3 pill-input shadow-[0_0_100px_rgba(59,130,246,0.15)] bg-blue-900/30 backdrop-blur-xl border-blue-400/40">
                    <input
                      type="text"
                      value={state.pitch}
                      onChange={(e) => setState(prev => ({ ...prev, pitch: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && startDebate()}
                      placeholder="What's your billion-dollar idea?"
                      className="flex-1 bg-transparent px-8 py-6 text-2xl focus:outline-none placeholder:text-white/50 font-medium font-medium text-white"
                    />
                    <button
                      onClick={startDebate}
                      disabled={!state.pitch.trim()}
                      className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_40px_rgba(59,130,246,0.4)] hover:bg-blue-500 transition-all"
                    >
                      <ArrowRight className="w-8 h-8 text-white" />
                    </button>
                  </div>
                  <div className="mt-8 flex justify-center gap-12 text-white/60 font-medium font-mono text-[10px] uppercase tracking-[0.3em]">
                    <span>Secure Analysis</span>
                    <span>•</span>
                    <span>Real-time Feedback</span>
                    <span>•</span>
                    <span>Expert Consensus</span>
                  </div>
                </motion.div>
              </div>

              {/* Our Goal Section */}
              <section ref={goalRef} className="py-48 border-t border-blue-400/20 w-full bg-blue-900/30">
                <div className="max-w-6xl mx-auto px-4">
                  <div className="space-y-24">
                    <div className="max-w-3xl space-y-8">
                      <h2 className="serif-display text-7xl md:text-8xl text-white leading-none">The Fire of<br /><span className="italic text-blue-500">Criticism.</span></h2>
                      <ScrollText text="Roast My Pitch is designed to stress-test your startup ideas before you ever step into a boardroom. We believe that the best ideas are forged in the fire of criticism." />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                      <div className="glass-card p-12 rounded-[40px] space-y-6 border-blue-400/30">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                          <Cpu className="w-6 h-6 text-blue-400" />
                        </div>
                        <h3 className="serif-display text-4xl text-white">Why Roast?</h3>
                        <p className="text-white/90 font-medium leading-relaxed text-lg">
                          Investors are busy. They see thousands of pitches a year. Most founders fail not because their idea is bad, 
                          but because they haven't anticipated the brutal questions that come after the presentation. 
                          Our AI agents are trained to find the weak points that others are too polite to mention.
                        </p>
                        <ul className="space-y-4 text-white/80 font-medium text-sm font-mono uppercase tracking-widest">
                          <li className="flex items-center gap-3"><Zap className="w-4 h-4 text-blue-500" /> Market Saturation Analysis</li>
                          <li className="flex items-center gap-3"><Zap className="w-4 h-4 text-blue-500" /> Execution Risk Assessment</li>
                          <li className="flex items-center gap-3"><Zap className="w-4 h-4 text-blue-500" /> Scalability Stress Testing</li>
                        </ul>
                      </div>
                      
                      <div className="glass-card p-12 rounded-[40px] space-y-6 border-blue-400/30">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                          <Shield className="w-6 h-6 text-emerald-400" />
                        </div>
                        <h3 className="serif-display text-4xl text-white">The Defense</h3>
                        <p className="text-white/90 font-medium leading-relaxed text-lg">
                          It's not all about the roast. Every great pitch needs a champion. Our Defender agent helps you find 
                          the narrative that turns a risk into an opportunity. We help you build the "Unfair Advantage" 
                          that makes your startup inevitable.
                        </p>
                        <ul className="space-y-4 text-white/80 font-medium text-sm font-mono uppercase tracking-widest">
                          <li className="flex items-center gap-3"><Activity className="w-4 h-4 text-emerald-500" /> Moat Identification</li>
                          <li className="flex items-center gap-3"><Activity className="w-4 h-4 text-emerald-500" /> Vision Clarification</li>
                          <li className="flex items-center gap-3"><Activity className="w-4 h-4 text-emerald-500" /> Narrative Refinement</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* How it Works Section */}
              <section ref={howItWorksRef} className="py-48 border-t border-blue-400/20 w-full">
                <div className="max-w-7xl mx-auto px-4 space-y-32">
                  <div className="text-center space-y-4">
                    <h2 className="serif-display text-6xl md:text-7xl text-white">The Process</h2>
                    <p className="text-white/60 font-medium uppercase tracking-[0.4em] font-bold text-[10px]">From Idea to Investment Readiness</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
                    {[
                      { step: "01", title: "The Submission", desc: "Submit your startup idea to our multi-agent framework for initial processing." },
                      { step: "02", title: "The Debate", desc: "Watch as the Roaster and Defender battle over your value proposition." },
                      { step: "03", title: "The Verdict", desc: "Receive a data-driven score and a pragmatic path forward from the Judge." }
                    ].map((item, idx) => (
                      <div key={idx} className="bg-blue-900/30 backdrop-blur-md border border-blue-400/20 rounded-[32px] hover:bg-blue-900/40 hover:-translate-y-1 transition-all relative p-12 space-y-6 group shadow-2xl">
                        <span className="oversized-number text-white">{item.step}</span>
                        <div className="relative z-10 space-y-4">
                          <h3 className="serif-display text-4xl text-white group-hover:text-blue-500 transition-colors">{item.title}</h3>
                          <p className="text-white/80 font-medium font-serif italic text-lg leading-relaxed">{item.desc}</p>
                        </div>
                        <div className="absolute bottom-0 left-12 right-12 h-px bg-blue-900/30 group-hover:bg-blue-500/30 transition-colors" />
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Our Services Section */}
              <section ref={servicesRef} className="py-24 border-t border-blue-400/30 w-full">
                <div className="max-w-6xl mx-auto space-y-16">
                  <div className="text-center space-y-4">
                    <h2 className="serif-display text-5xl md:text-6xl text-white">Our Services</h2>
                    <p className="text-white/80 font-medium uppercase tracking-widest font-bold text-xs">The Multi-Agent Analysis Framework</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {(Object.keys(AGENTS) as AgentRole[]).map((role) => {
                      const agent = AGENTS[role];
                      const Icon = role === 'ROASTER' ? Flame : role === 'DEFENDER' ? Shield : Scale;
                      return (
                        <div key={role} className="bg-blue-900/40 backdrop-blur-sm p-8 rounded-2xl space-y-6 border border-blue-400/30 hover:border-blue-500/50 transition-all group relative overflow-hidden shadow-2xl">
                          {/* Hardware Details */}
                          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
                          <div className="absolute top-4 right-4 flex gap-1">
                            <div className="w-1 h-1 rounded-full bg-blue-500/40 animate-pulse" />
                            <div className="w-1 h-1 rounded-full bg-white/10" />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center bg-opacity-10 border border-blue-400/20", agent.color)}>
                              <Icon className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                            </div>
                            <span className="font-mono text-[10px] text-white/60 font-medium tracking-[0.2em]">MOD_0{role === 'ROASTER' ? '1' : role === 'DEFENDER' ? '2' : '3'}</span>
                          </div>

                          <div className="space-y-2">
                            <h3 className="serif-display text-3xl text-white">{agent.name}</h3>
                            <div className="h-px w-full bg-gradient-to-r from-white/10 to-transparent" />
                          </div>

                          <p className="text-white/90 font-medium leading-relaxed font-serif italic text-lg min-h-[100px]">
                            {role === 'ROASTER' && "Identifies every flaw, market risk, and execution hurdle. If your idea can survive the Roaster, it can survive the market."}
                            {role === 'DEFENDER' && "Finds the hidden brilliance and untapped potential. Helps you articulate your 'unfair advantage' and long-term vision."}
                            {role === 'JUDGE' && "Provides a pragmatic, data-driven verdict and a score to help you understand how a VC might perceive your pitch."}
                          </p>

                          <div className="pt-4 space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="font-mono text-[9px] uppercase tracking-widest text-white/70 font-medium">System Integrity</span>
                              <span className="font-mono text-[9px] text-blue-500/60">98.4%</span>
                            </div>
                            <div className="h-1 w-full bg-blue-900/30 rounded-full overflow-hidden p-[1px]">
                              <motion.div 
                                initial={{ width: 0 }}
                                whileInView={{ width: role === 'ROASTER' ? '85%' : role === 'DEFENDER' ? '92%' : '78%' }}
                                className="h-full bg-blue-500/40 rounded-full" 
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            </motion.div>
          ) : (
            <motion.div 
              key="debate"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* Agent Boxes */}
              {(Object.keys(AGENTS) as AgentRole[]).map((role) => (
                <AgentBox 
                  key={role}
                  role={role}
                  messages={state.messages.filter(m => m.role === role)}
                  isSpeaking={state.currentSpeaker === role}
                  isThinking={isThinking && state.currentSpeaker === role}
                  score={role === 'JUDGE' ? state.score : null}
                />
              ))}

              {/* User Interaction & Controls */}
              <div className="lg:col-span-3 mt-8 flex flex-col items-center gap-6">
                <div className="w-full max-w-2xl flex gap-4 p-2 pill-input bg-blue-900/30 backdrop-blur-md shadow-2xl">
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUserReply()}
                    placeholder={state.currentSpeaker === 'USER' ? "Defend your idea..." : "Wait for your turn..."}
                    disabled={state.currentSpeaker !== 'USER' || isThinking}
                    className="flex-1 bg-transparent px-6 py-3 text-lg focus:outline-none disabled:opacity-30 text-white"
                  />
                  <button
                    onClick={handleUserReply}
                    disabled={state.currentSpeaker !== 'USER' || !userInput.trim() || isThinking}
                    className="circle-btn disabled:opacity-30"
                  >
                    <ArrowRight className="w-6 h-6" />
                  </button>
                </div>
                
                <button 
                  onClick={resetDebate}
                  className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-white/70 font-medium hover:text-white transition-colors"
                >
                  <RefreshCcw className="w-4 h-4" /> Reset Pitch
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer ref={contactRef} className="bg-black/80 backdrop-blur-lg border-t border-blue-400/30 pt-24 pb-12 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-24">
          <div className="space-y-6 col-span-1 md:col-span-1">
            <h2 className="serif-display text-3xl text-white">Roast My Pitch</h2>
            <div className="space-y-4 text-white/80 font-medium text-sm">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 mt-1 text-blue-500" />
                <p>20619 Torrence Chapel Rd<br />Suite 116 #1040<br />Cornelius, NC 28031</p>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-blue-500" />
                <p>1-800-ROAST-ME</p>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-blue-500" />
                <p>support@roastmypitch.com</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="text-xs font-bold uppercase tracking-widest text-white">Quick Links</h4>
            <ul className="space-y-3 text-white/80 font-medium text-sm">
              <li className="hover:text-blue-500 cursor-pointer transition-colors">Pricing</li>
              <li className="hover:text-blue-500 cursor-pointer transition-colors">Resources</li>
              <li className="hover:text-blue-500 cursor-pointer transition-colors">About Us</li>
              <li className="hover:text-blue-500 cursor-pointer transition-colors">FAQ</li>
            </ul>
          </div>

          <div className="space-y-6">
            <h4 className="text-xs font-bold uppercase tracking-widest text-white">Social</h4>
            <ul className="space-y-3 text-white/80 font-medium text-sm">
              <li className="flex items-center gap-2 hover:text-blue-500 cursor-pointer transition-colors"><Facebook className="w-4 h-4" /> Facebook</li>
              <li className="flex items-center gap-2 hover:text-blue-500 cursor-pointer transition-colors"><Twitter className="w-4 h-4" /> Twitter</li>
              <li className="flex items-center gap-2 hover:text-blue-500 cursor-pointer transition-colors"><Linkedin className="w-4 h-4" /> LinkedIn</li>
              <li className="flex items-center gap-2 hover:text-blue-500 cursor-pointer transition-colors"><Github className="w-4 h-4" /> GitHub</li>
            </ul>
          </div>

          <div className="space-y-6">
            <h4 className="text-xs font-bold uppercase tracking-widest text-white">Legal</h4>
            <ul className="space-y-3 text-white/80 font-medium text-sm">
              <li className="hover:text-blue-500 cursor-pointer transition-colors">Terms of Service</li>
              <li className="hover:text-blue-500 cursor-pointer transition-colors">Privacy Policy</li>
              <li className="hover:text-blue-500 cursor-pointer transition-colors">Cookie Policy</li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-12 border-t border-blue-400/20 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-20 text-white">
            © 2026 RoastMyPitch • Built with Gemini 3.1 • Open Innovation
          </p>
        </div>
      </footer>
    </div>
  );
}

function AgentBox({ role, messages, isSpeaking, isThinking, score }: { 
  role: AgentRole; 
  messages: Message[]; 
  isSpeaking: boolean; 
  isThinking: boolean;
  score: number | null;
}) {
  const agent = AGENTS[role];
  const Icon = role === 'ROASTER' ? Flame : role === 'DEFENDER' ? Shield : Scale;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  return (
    <motion.div 
      layout
      className={cn(
        "flex flex-col h-[650px] bg-[#0A192F] shadow-[0_0_80px_rgba(30,58,138,0.5)] rounded-2xl overflow-hidden transition-all duration-500 border relative",
        isSpeaking 
          ? "border-blue-400 scale-[1.02] shadow-[0_0_100px_rgba(59,130,246,0.5)]" 
          : "border-blue-800 opacity-80"
      )}
    >
      {/* Hardware Accents */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
      <div className="absolute top-0 left-4 w-px h-full bg-white/[0.02]" />
      <div className="absolute top-0 right-4 w-px h-full bg-white/[0.02]" />

      {/* Bot Eye / Scanner Visual */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-32 h-32 opacity-[0.03] pointer-events-none">
        <motion.div 
          animate={isSpeaking ? { scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] } : {}}
          transition={{ repeat: Infinity, duration: 2 }}
          className={cn("w-full h-full rounded-full border-4 border-dashed", isSpeaking ? "border-blue-500" : "border-white")}
        />
        <motion.div 
          animate={isSpeaking ? { y: [-40, 40, -40] } : {}}
          transition={{ repeat: Infinity, duration: 3 }}
          className="absolute top-1/2 left-0 w-full h-1 bg-blue-500/20 blur-sm"
        />
      </div>

      {/* Header */}
      <div className="p-6 border-b border-blue-600 flex items-center justify-between bg-[#112240] relative">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-opacity-10 border border-blue-400/20", agent.color)}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            {/* Bot Status Light */}
            <div className={cn(
              "absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[#151619]",
              isSpeaking ? "bg-blue-500 animate-pulse" : "bg-white/10"
            )} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="serif-display text-xl font-bold text-white">{agent.name}</h3>
            </div>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/70 font-medium">{agent.description}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-[9px] text-white/60 font-medium uppercase tracking-widest">AI CORE</p>
          <p className="font-mono text-[10px] text-white/80 font-medium">V3.1_ACTIVE</p>
        </div>
      </div>

      {/* Content Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth relative">
        {/* Grid Background Overlay */}
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        
        {messages.length === 0 && !isThinking ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-20 space-y-4">
            <div className="relative w-16 h-16">
              <Icon className="w-full h-full text-white/90 font-medium" />
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
                className="absolute inset-0 border border-dashed border-blue-400/40 rounded-full"
              />
            </div>
            <p className="text-xs font-mono uppercase tracking-[0.3em] text-white">Standby Mode</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                key={msg.id} 
                className="space-y-3"
              >
                <div className="flex items-center gap-2">
                  <div className={cn("w-1 h-1", isSpeaking ? "bg-blue-500" : "bg-white/20")} />
                  <span className="font-mono text-[8px] uppercase tracking-widest text-white/60 font-medium">Neural Output</span>
                </div>
                <div className="markdown-body text-base leading-relaxed font-serif italic text-white font-medium pl-3 border-l border-blue-400/30">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </motion.div>
            ))}
            {isThinking && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Activity className="w-3 h-3 animate-pulse text-blue-500/60" />
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-blue-500/40">Synthesizing Response...</span>
                </div>
                <div className="flex gap-1 h-4 items-end">
                  {[...Array(12)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ height: [4, 16, 4] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.05 }}
                      className="w-1 bg-blue-500/20 rounded-full"
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer / Score */}
      {role === 'JUDGE' && score !== null && (
        <div className="p-8 bg-blue-900/60 backdrop-blur-md border-t border-dashed border-blue-400/30 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-blue-500/20" />
          <div className="flex items-end justify-between">
            <div className="text-left space-y-1">
              <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/70 font-medium">Final Verdict</p>
              <p className="font-mono text-[8px] text-blue-500/40">Confidence Level: 94.2%</p>
            </div>
            <div className="text-right">
              <span className="serif-display text-6xl font-medium text-white">{score}</span>
              <span className="font-mono text-xs text-white/60 font-medium ml-1">/100</span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
