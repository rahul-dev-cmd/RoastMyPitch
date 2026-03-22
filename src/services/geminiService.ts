import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import { AgentRole, Message } from "../types";
import { SYSTEM_INSTRUCTIONS } from "../constants";

// Fix for Vite: safe access to env vars
const apiKey = typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : import.meta.env.VITE_GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key-to-prevent-crash' });

export async function getAgentResponse(
  role: AgentRole,
  pitch: string,
  history: Message[]
): Promise<string> {
  const model = "gemini-3-flash-preview";
  
  // Format history for the model
  const historyText = history
    .map((m) => `${m.role === 'USER' ? 'User' : m.role}: ${m.content}`)
    .join('\n\n');

  const prompt = `
Original Startup Pitch: "${pitch}"

Debate History:
${historyText}

Now, as ${role}, provide your response to the pitch and the ongoing debate.
`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTIONS[role],
        temperature: 0.8,
        topP: 0.95,
      },
    });

    return response.text || "I'm speechless... (Error generating response)";
  } catch (error) {
    console.error(`Error getting response for ${role}:`, error);
    return `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}

export async function generateSpeech(text: string, role: AgentRole): Promise<string | undefined> {
  // Map roles to voices
  const voiceMap: Record<AgentRole, string> = {
    ROASTER: 'Fenrir', // Harsh/Deep
    DEFENDER: 'Kore', // Soft/Optimistic
    JUDGE: 'Zephyr', // Authoritative/Neutral
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceMap[role] },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (error) {
    console.error("Speech generation error:", error);
    return undefined;
  }
}

export function extractScore(text: string): number | null {
  const match = text.match(/FINAL SCORE:\s*(\d+)\/100/i);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return null;
}
