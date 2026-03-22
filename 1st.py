from langgraph.graph import StateGraph, END
from typing import TypedDict, List

# Define the state using TypedDict
class State(TypedDict, total=False):
    numbers: List[int]
    sum: int

# Step 1: Say Hi
def say_hi(state):
    print("Hi 👋")
    return state

# Step 2: Create list of numbers
def generate_numbers(state):
    numbers = [1, 2, 3, 4, 5]
    print("Numbers:", numbers)
    return {"numbers": numbers}

# Step 3: Calculate sum
def calculate_sum(state):
    total = sum(state["numbers"])
    print("Sum:", total)
    return {"sum": total}

# Build the graph
builder = StateGraph(State)

builder.add_node("say_hi", say_hi)
builder.add_node("generate_numbers", generate_numbers)
builder.add_node("calculate_sum", calculate_sum)

# Define flow
builder.set_entry_point("say_hi")
builder.add_edge("say_hi", "generate_numbers")
builder.add_edge("generate_numbers", "calculate_sum")
builder.add_edge("calculate_sum", END)

# Compile and run
graph = builder.compile()
graph.invoke({})