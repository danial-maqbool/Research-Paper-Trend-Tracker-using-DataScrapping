import os
import json
import re
import time
import logging
from typing import Dict, Any, Optional
from google import genai
from google.genai import types
from backend.config import GEMINI_API_KEY, GEMINI_MODEL, GEMINI_MAX_REQUESTS_PER_MINUTE
from backend.models.schemas import GeminiAnalysisResult

logger = logging.getLogger("gemini_service")

ANALYSIS_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "summary": {
            "type": "STRING",
            "description": "2 to 3 concise sentences summarizing the paper's core methodology, experiments, and primary conclusions."
        },
        "keywords": {
            "type": "ARRAY",
            "items": {"type": "STRING"},
            "description": "3 to 8 specific technical research keywords extracted from the paper."
        },
        "topics": {
            "type": "ARRAY",
            "items": {"type": "STRING"},
            "description": "1 to 3 high-level research topics (e.g. Large Language Models, Multimodal Learning, Reinforcement Learning, Computer Vision, Robotics, etc.)."
        },
        "paper_type": {
            "type": "STRING",
            "enum": [
                "new method",
                "benchmark",
                "survey",
                "dataset",
                "system",
                "theoretical work",
                "evaluation study",
                "application paper",
                "position paper"
            ],
            "description": "The category of contribution the paper provides."
        },
        "technical_difficulty": {
            "type": "STRING",
            "enum": ["beginner", "intermediate", "advanced", "specialist"],
            "description": "Assessed technical prerequisite level required to understand the paper."
        },
        "potential_impact_area": {
            "type": "STRING",
            "description": "High-level domain or industry most impacted by this work (e.g., Healthcare, Autonomous Vehicles, Cybersecurity, Software Engineering, Scientific Discovery)."
        }
    },
    "required": ["summary", "keywords", "topics", "paper_type", "technical_difficulty", "potential_impact_area"]
}

class GeminiService:
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY") or GEMINI_API_KEY
        # Allow gemini-2.5-flash, gemini-3.8-flash, gemini-1.5-flash
        self.model_name = model or os.getenv("GEMINI_MODEL") or GEMINI_MODEL
        self.client = None
        if self.api_key and self.api_key.strip():
            try:
                self.client = genai.Client(api_key=self.api_key.strip())
            except Exception as e:
                logger.warning(f"Could not initialize google-genai client: {e}")

        # Rate limiter setup
        self.min_interval = 60.0 / max(1, GEMINI_MAX_REQUESTS_PER_MINUTE)
        self.last_call_time: float = 0.0

    def _wait_rate_limit(self):
        elapsed = time.time() - self.last_call_time
        if elapsed < self.min_interval:
            time.sleep(self.min_interval - elapsed)
        self.last_call_time = time.time()

    def analyze_paper(self, title: str, abstract: str) -> Optional[Dict[str, Any]]:
        """
        Analyzes paper title and abstract using Gemini Flash.
        Returns validated structured dictionary or None on failure.
        """
        if not title or not abstract:
            return None

        # If no client or API key, return heuristic fallback analysis
        if not self.client:
            logger.info("No Gemini API key configured. Using intelligent heuristic extraction.")
            return self._heuristic_analysis(title, abstract)

        self._wait_rate_limit()

        prompt = f"""
Analyze this academic research paper based only on its title and abstract.

Title: {title}

Abstract:
{abstract}

Provide structured analysis adhering strictly to the required schema.
Do not hallucinate facts beyond the abstract.
"""

        try:
            # First attempt: structured generation using Google GenAI SDK
            # Normalize model name for Google API: default to gemini-2.5-flash if user provides gemini-3.8-flash or similar
            target_model = self.model_name
            if "3.8" in target_model or "2.5" in target_model:
                target_model = "gemini-2.5-flash"

            response = self.client.models.generate_content(
                model=target_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=ANALYSIS_SCHEMA,
                    temperature=0.2,
                ),
            )

            raw_text = response.text.strip()
            # Validate JSON
            data = json.loads(raw_text)
            validated = GeminiAnalysisResult(**data)
            return validated.model_dump()

        except Exception as e:
            logger.warning(f"Gemini API analysis failed: {e}. Falling back to heuristic extraction.")
            return self._heuristic_analysis(title, abstract)

    def _heuristic_analysis(self, title: str, abstract: str) -> Dict[str, Any]:
        """
        Robust heuristic metadata extractor used when API key is unset or network fails.
        Ensures the application remains fully functional with clean structured data.
        """
        text = f"{title} {abstract}".lower()

        # Detect paper type
        paper_type = "new method"
        if any(w in text for w in ["survey", "review", "comprehensive overview", "literature"]):
            paper_type = "survey"
        elif any(w in text for w in ["benchmark", "benchmarking", "comparative evaluation"]):
            paper_type = "benchmark"
        elif any(w in text for w in ["dataset", "corpus", "collection of data"]):
            paper_type = "dataset"
        elif any(w in text for w in ["system", "architecture", "framework", "platform"]):
            paper_type = "system"
        elif any(w in text for w in ["theorem", "bound", "theoretical", "proof", "convergence"]):
            paper_type = "theoretical work"
        elif any(w in text for w in ["evaluation", "empirical study", "case study"]):
            paper_type = "evaluation study"
        elif any(w in text for w in ["application", "applied", "deployment"]):
            paper_type = "application paper"
        elif any(w in text for w in ["position", "perspective", "future directions"]):
            paper_type = "position paper"

        # Detect technical difficulty
        difficulty = "intermediate"
        if any(w in text for w in ["theorem", "asymptotic", "differential", "proof", "manifold", "lemma"]):
            difficulty = "specialist"
        elif any(w in text for w in ["novel architecture", "theoretical", "mathematical formulation"]):
            difficulty = "advanced"
        elif any(w in text for w in ["introduction", "tutorial", "accessible", "overview"]):
            difficulty = "beginner"

        # Detect topics
        topics = []
        topic_map = {
            "Large Language Models": ["llm", "large language model", "transformer", "gpt", "prompting", "in-context", "instruction tuning"],
            "Multimodal Learning": ["multimodal", "vision-language", "vlm", "audio-visual", "cross-modal", "clip"],
            "Diffusion Models": ["diffusion", "denoising", "score-based", "generative model", "text-to-image"],
            "Reinforcement Learning": ["reinforcement learning", "rlhf", "policy gradient", "q-learning", "reward model", "actor-critic"],
            "Computer Vision": ["segmentation", "object detection", "nerf", "gaussian splatting", "image synthesis", "optical flow"],
            "Robotics": ["robot", "manipulation", "locomotion", "end-effector", "trajectory", "teleoperation"],
            "Information Retrieval": ["retrieval", "search", "indexing", "ranking", "dense retrieval", "embedding"],
            "Model Compression": ["quantization", "pruning", "distillation", "efficient", "sparsity", "low-rank"],
            "Autonomous Agents": ["agent", "multi-agent", "agentic", "tool use", "planning", "reasoning"],
            "Security & Privacy": ["privacy", "adversarial", "backdoor", "jailbreak", "cryptography", "robustness"]
        }

        for topic_name, keywords in topic_map.items():
            if any(kw in text for kw in keywords):
                topics.append(topic_name)
                if len(topics) >= 3:
                    break

        if not topics:
            topics = ["Machine Learning Systems"]

        # Extract keywords
        extracted_keywords = []
        common_candidates = [
            "deep learning", "neural networks", "transformers", "attention mechanism",
            "fine-tuning", "parameter-efficient", "generalization", "representation learning",
            "contrastive learning", "zero-shot", "few-shot", "data augmentation",
            "interpretability", "robustness", "benchmarking", "optimization", "graph neural networks",
            "federated learning", "self-supervised", "generative ai"
        ]
        for candidate in common_candidates:
            if candidate in text:
                extracted_keywords.append(candidate)
                if len(extracted_keywords) >= 6:
                    break

        if len(extracted_keywords) < 3:
            extracted_keywords.extend(["machine learning", "artificial intelligence", "data science"][:3 - len(extracted_keywords)])

        # Potential impact area
        impact = "Artificial Intelligence"
        if "health" in text or "medical" in text or "clinical" in text:
            impact = "Healthcare & Biomedicine"
        elif "security" in text or "attack" in text or "privacy" in text:
            impact = "Cybersecurity & Privacy"
        elif "robot" in text or "autonomous" in text:
            impact = "Robotics & Automation"
        elif "code" in text or "software" in text or "developer" in text:
            impact = "Software Engineering"
        elif "finance" in text or "market" in text:
            impact = "Finance & Economics"

        # Construct 2-3 sentence summary from abstract
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", abstract) if s.strip()]
        if len(sentences) >= 2:
            summary = " ".join(sentences[:2])
        elif sentences:
            summary = sentences[0]
        else:
            summary = f"This paper explores {title.lower()} within modern machine learning research."

        return {
            "summary": summary,
            "keywords": extracted_keywords,
            "topics": topics,
            "paper_type": paper_type,
            "technical_difficulty": difficulty,
            "potential_impact_area": impact
        }
