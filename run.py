import uvicorn
import sys
import os
from backend.config import HOST, PORT

if __name__ == "__main__":
    print(f"Starting Research Paper Trend Tracker on http://{HOST}:{PORT}...")
    uvicorn.run("backend.main:app", host=HOST, port=PORT, reload=False)
