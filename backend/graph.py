from langgraph.graph import StateGraph, END
from typing import TypedDict, List, Dict
from groq import Groq
import os
from agents import DEVILS_ADVOCATE_PROMPT, SUPPORTER_PROMPT, ANALYST_PROMPT
from dotenv import load_dotenv
load_dotenv()

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

class DebateState(TypedDict):
    idea: str
    messages: List[Dict]        # full conversation history
    devil_response: str
    supporter_response: str
    analyst_response: str
    round: int

def call_groq(system_prompt: str, messages: List[Dict]) -> str:
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "system", "content": system_prompt}] + messages,
        max_tokens=800,
        temperature=0.7,
    )
    return response.choices[0].message.content

def devil_node(state: DebateState) -> DebateState:
    messages = state["messages"]
    response = call_groq(DEVILS_ADVOCATE_PROMPT, messages)
    state["devil_response"] = response
    return state

def supporter_node(state: DebateState) -> DebateState:
    # Supporter sees devil's argument too as a user prompt
    messages = state["messages"] + [
        {"role": "user", "content": f"Here is the Roaster's attack. Defend against it:\n[Devil's Advocate]: {state['devil_response']}"}
    ]
    response = call_groq(SUPPORTER_PROMPT, messages)
    state["supporter_response"] = response
    return state

def analyst_node(state: DebateState) -> DebateState:
    # Analyst sees both devil and supporter arguments as a user prompt
    messages = state["messages"] + [
        {"role": "user", "content": f"Here are the arguments so far:\n[Devil's Advocate]: {state['devil_response']}\n[Supporter]: {state['supporter_response']}\nNow provide your verdict and score."}
    ]
    response = call_groq(ANALYST_PROMPT, messages)
    state["analyst_response"] = response
    return state

def build_graph():
    graph = StateGraph(DebateState)
    graph.add_node("devil", devil_node)
    graph.add_node("supporter", supporter_node)
    graph.add_node("analyst", analyst_node)
    graph.set_entry_point("devil")
    graph.add_edge("devil", "supporter")
    graph.add_edge("supporter", "analyst")
    graph.add_edge("analyst", END)
    return graph.compile()

debate_graph = build_graph()