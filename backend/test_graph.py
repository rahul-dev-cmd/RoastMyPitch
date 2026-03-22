import traceback
try:
    from main import run_debate
    print("Running...")
    run_debate("test_session", "AI for pets", "AI for pets")
    print("Done")
except Exception as e:
    with open("err.txt", "w", encoding="utf-8") as f:
        traceback.print_exc(file=f)
    print("Error saved to err.txt")
