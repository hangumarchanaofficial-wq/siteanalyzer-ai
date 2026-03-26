# AI Website Audit Tool - Backend Extraction Engine
"""
backend.ai — AI analysis pipeline.

Public surface:

    from backend.ai import analyse_with_ai

    snapshot = await analyse_url("https://example.com")   # from engine.py
    report   = await analyse_with_ai(snapshot)             # → validated dict
"""

from backend.ai.ai_analyzer import analyse_with_ai

__all__ = ["analyse_with_ai"]
