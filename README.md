# SiteAnalyzer AI

Single-page website audit tool for the EIGHT25MEDIA AI-native assignment. It separates factual extraction from AI analysis, then returns structured insights and prioritized recommendations grounded in the extracted metrics.

## What It Does

- Accepts a single URL
- Extracts factual page metrics:
  word count, heading counts, CTA count, internal/external links, image totals, missing alt percentage, meta title, meta description
- Runs AI analysis over the extracted snapshot
- Returns structured insights for SEO structure, messaging clarity, CTA usage, content depth, and UX concerns
- Produces 3-5 prioritized recommendations tied to factual metrics

## Architecture

High-level pipeline:

1. `backend/fetcher.py`
   Renders the target page with Playwright and collects runtime diagnostics.
2. `backend/parser.py`
   Converts rendered HTML into a parseable DOM.
3. `backend/extractor.py`
   Extracts factual metrics and content signals from the DOM.
4. `backend/ai/prompt_builder.py`
   Builds a grounded system prompt plus a structured user prompt from the snapshot.
5. `backend/ai/ai_analyzer.py`
   Calls the selected LLM backend, retries on transient failures, and writes prompt/raw-output artifacts under `logs/`.
6. `backend/ai/validator.py`
   Validates, clamps, and repairs AI output before it is returned to the UI.
7. `src/`
   Next.js frontend that keeps factual metrics visually separate from AI-derived insights and recommendations.

## AI Design Decisions

- The AI layer only receives structured metrics and bounded content signals, not raw uncontrolled HTML.
- Prompt construction is deterministic and grounded in a factual snapshot.
- The validator rejects or repairs outputs that are missing required fields, cite unknown metrics, or fall outside the required 3-5 recommendation range.
- Prompt artifacts are persisted into `logs/` so the orchestration is inspectable after a run.
- The frontend maps structured issues directly into prioritized recommendation cards instead of rendering free-form LLM prose.

## Prompt Logs

After an audit run, the repository writes:

- [`logs/prompt-log.md`](e:/ai-website-audit-tool/logs/prompt-log.md)
- [`logs/sample-input.json`](e:/ai-website-audit-tool/logs/sample-input.json)
- [`logs/sample-prompt.txt`](e:/ai-website-audit-tool/logs/sample-prompt.txt)
- [`logs/sample-raw-output.json`](e:/ai-website-audit-tool/logs/sample-raw-output.json)

These show the structured input snapshot, the prompts sent to the model, and the raw model output before extraction/repair.

## Local Run

### Node + Python

Frontend:

```bash
npm install
npm run dev
```

Backend:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r backend/requirements.txt
python -m playwright install chromium
python -m uvicorn backend.server:app --reload --port 8000
```

### Docker

```bash
docker build -t siteanalyzer-ai .
docker run --rm -p 3000:3000 --env-file .env -e DEFAULT_AI_BACKEND=openrouter siteanalyzer-ai
```

## Environment Variables

- `OPENROUTER_API_KEY`
- `DEFAULT_AI_BACKEND=openrouter`
- `OPENROUTER_MODEL`
- `OPENROUTER_REQUEST_TIMEOUT_S`
- `AI_MAX_LLM_RETRIES`
- `AI_RETRY_BACKOFF_S`
- `AUDIT_API_BASE_URL=http://127.0.0.1:8000`

## Trade-offs

- The app audits one page only; there is no multi-page crawl or site-wide aggregation.
- Factual extraction is heuristic, not browser-devtools-grade page analysis.
- The AI output is constrained and validated, which improves reliability but limits expressive depth.
- Attention modeling and benchmark visuals are heuristic overlays, not real eye-tracking or historical benchmark datasets.

## What I Would Improve With More Time

- Add stronger prompt artifact versioning per audit run instead of overwriting the latest sample files.
- Persist audit history and downloadable reports in a database.
- Add richer automated tests around extraction accuracy and validator edge cases.
- Add a stable offline demo report path so the demo button never depends on live LLM availability.
- Tighten deployment automation for ECR/App Runner and fail-fast behavior in the deployment script.
