import os
from pathlib import Path
from dotenv import load_dotenv

# Base paths
BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"

if ENV_FILE.exists():
    load_dotenv(ENV_FILE)
else:
    load_dotenv()

# App Settings
HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "8000"))
DEBUG = os.getenv("DEBUG", "false").lower() == "true"

# Database
DB_PATH = Path(os.getenv("DB_PATH", str(BASE_DIR / "database" / "papers.db")))
DB_PATH.parent.mkdir(parents=True, exist_ok=True)
SCHEMA_PATH = BASE_DIR / "database" / "schema.sql"

# Gemini AI Settings
# Defaulting to Gemini 2.5 Flash / 3.8 Flash
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
AI_ANALYSIS_ENABLED = os.getenv("AI_ANALYSIS_ENABLED", "true").lower() == "true"
GEMINI_MAX_REQUESTS_PER_MINUTE = int(os.getenv("GEMINI_MAX_REQUESTS_PER_MINUTE", "15"))

# arXiv Scraper Defaults
ARXIV_REQUEST_DELAY = float(os.getenv("ARXIV_REQUEST_DELAY", "3.0"))
ARXIV_MAX_RESULTS_DEFAULT = int(os.getenv("ARXIV_MAX_RESULTS_DEFAULT", "50"))

# Default research categories
DEFAULT_CATEGORIES = [
    {"id": "cs.AI", "name": "Artificial Intelligence", "description": "Covers all areas of AI except NLP, Robotics, and Vision"},
    {"id": "cs.LG", "name": "Machine Learning", "description": "Machine learning, statistical learning, neural nets"},
    {"id": "cs.CL", "name": "Computation and Language", "description": "NLP, computational linguistics, LLMs"},
    {"id": "cs.CV", "name": "Computer Vision", "description": "Computer vision, image/video generation and perception"},
    {"id": "cs.RO", "name": "Robotics", "description": "Robotics systems, manipulation, control, planning"},
    {"id": "cs.CR", "name": "Cryptography and Security", "description": "Security, privacy, cryptography"},
    {"id": "cs.HC", "name": "Human-Computer Interaction", "description": "User interfaces, HCI, human-AI interaction"},
    {"id": "cs.DC", "name": "Distributed Computing", "description": "Distributed systems, clusters, edge computing"},
    {"id": "cs.IR", "name": "Information Retrieval", "description": "Search, ranking, indexing, recommenders"}
]
