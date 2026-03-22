export type AgentRole = 'ROASTER' | 'DEFENDER' | 'JUDGE';

export interface Message {
  id: string;
  role: AgentRole | 'USER';
  content: string;
  timestamp: number;
}

export interface DebateState {
  pitch: string;
  messages: Message[];
  score: number;
  isDebating: boolean;
  currentSpeaker: AgentRole | 'USER' | null;
}
