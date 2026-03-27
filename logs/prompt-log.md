# Prompt Log

This repository writes prompt artifacts for each audit run.

Generated files:
- `logs/sample-input.json`: structured snapshot used to build the AI prompt
- `logs/sample-prompt.txt`: exact system prompt and user prompt sent to the model
- `logs/sample-raw-output.json`: raw model output before extraction and validation

AI orchestration flow:
1. `backend/fetcher.py` renders the page and captures runtime diagnostics.
2. `backend/extractor.py` converts the rendered DOM into a factual snapshot.
3. `backend/ai/prompt_builder.py` builds the grounded prompts.
4. `backend/ai/ai_analyzer.py` calls the model and persists prompt/output artifacts.
5. `backend/ai/validator.py` validates metric references, schema shape, and the required 3-5 recommendation range.
