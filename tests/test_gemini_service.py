import pytest
from backend.services.gemini_service import GeminiService
from backend.models.schemas import GeminiAnalysisResult

def test_gemini_schema_validation():
    valid_data = {
        "summary": "This paper presents a new diffusion architecture for vision. It outperforms previous GAN baselines.",
        "keywords": ["diffusion models", "generative ai", "image synthesis"],
        "topics": ["Diffusion Models", "Computer Vision"],
        "paper_type": "new method",
        "technical_difficulty": "advanced",
        "potential_impact_area": "Content Generation"
    }
    result = GeminiAnalysisResult(**valid_data)
    assert result.paper_type == "new method"
    assert result.technical_difficulty == "advanced"
    assert len(result.keywords) == 3

def test_heuristic_analysis_fallback():
    service = GeminiService(api_key="")
    title = "Empirical Benchmark of Large Language Models on Mathematical Reasoning"
    abstract = "In this work, we conduct a comprehensive benchmark and empirical evaluation of modern transformer models on complex math word problems. We evaluate accuracy, latency, and sample efficiency."

    analysis = service.analyze_paper(title, abstract)
    assert analysis is not None
    assert analysis["paper_type"] in ["benchmark", "evaluation study"]
    assert any("Language" in t or "Agent" in t or "Machine" in t for t in analysis["topics"])
    assert len(analysis["keywords"]) >= 3
    assert len(analysis["summary"]) > 20
