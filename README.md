# Ask What Matters

Ask What Matters is a submission-ready prototype for the Wharton/Expedia Hack-AI-thon. It uses the provided Expedia property datasets to detect what information is missing or stale for a hotel, asks one smart follow-up question, and captures the traveler’s answer by text or voice.

For a short recorded walkthrough, use https://www.loom.com/share/d5d2de466ea049969134275af875d84b.

## Challenge Framing

Static review prompts miss what matters most for a specific property right now. This prototype focuses on one polished flow:

1. A data-driven agent identifies the most useful missing or stale topic for that property.
2. A question-generation agent asks one short follow-up.
3. An integration agent saves the answer and summarizes what new information was learned.

## 3-Agent Workflow

### 1. Gap Analysis Agent
- Reads historical reviews from `Reviews_PROC.csv`
- Reads property context from `Description_PROC.csv`
- Chooses one target topic such as cleanliness, service, room comfort, or amenities
- Explains why the topic is missing, stale, or otherwise valuable

### 2. Question Agent
- Turns the selected topic plus current review text into one concise follow-up question
- Uses OpenAI for question generation and audio when configured
- Falls back to local heuristic prompts when `OPENAI_API_KEY` is not present

### 3. Integration Agent
- Takes the original review, follow-up question, and traveler answer
- Produces a short “what we learned” summary
- Produces an enriched review snippet and saves it to local demo storage

## Data Usage

The prototype uses both provided Expedia datasets:

- `data/Reviews_PROC.csv`
  Used to detect topic coverage, missing themes, stale themes, and sentiment signals for a specific property.
- `data/Description_PROC.csv`
  Used to provide property context such as location, amenities, and property description to ground the question-generation step.

### Topic Taxonomy

The demo uses a compact topic taxonomy:
- cleanliness
- service
- room_comfort
- amenities
- condition
- location
- value
- safety

### Recency Heuristic

A topic is considered:
- `missing` if it never appears in historical reviews for the property
- `stale` if it appears in older reviews but not within the latest 6 months of review history
- `covered` otherwise

This heuristic is intentionally simple and explicit for demo clarity.

## Quick Start

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:3000`.

## Environment

Set the following in `.env` for full functionality:

```bash
OPENAI_API_KEY=sk-...
```

Optional overrides:

```bash
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_TTS_MODEL=tts-1
OPENAI_TTS_VOICE=alloy
OPENAI_TRANSCRIPTION_MODEL=whisper-1
PORT=3000
```

## Fallback Behavior

If `OPENAI_API_KEY` is missing:
- question generation still works using local heuristics
- the UI clearly indicates fallback mode
- audio playback is disabled
- transcription returns a clear message instead of failing silently
- integration still produces a local saved summary

## API Summary

- `GET /api/health`
  Returns backend status, OpenAI configuration status, and demo property context.
- `POST /api/generate-question`
  Runs the gap-analysis agent and question agent.
- `POST /api/transcribe`
  Transcribes recorded voice input with OpenAI Whisper.
- `GET /api/answers`
  Returns saved answer history for the selected property.
- `POST /api/answers`
  Runs the integration agent and saves the answer record.

## Local Demo Notes

- `npm run dev` starts the Express server and serves the static frontend.
- The demo property defaults to Expedia property id `db38b19b897dbece3e34919c662b3fd66d23b615395d11fb69264dd3a9b17723`.
- Saved answers are stored in `data/savedAnswers.json` for demo persistence.

## Deployment

The hackathon submission requires a **public prototype link**. That means:

- for development, rehearsal, and video recording, `npm run dev` is enough
- for the final submission form, you should also deploy the app to a public URL

Recommended simple hosts:
- Vercel
- Replit
- Hugging Face Spaces

Minimum deployment checklist:
- set `OPENAI_API_KEY` in the host environment
- make sure `.env` is not committed
- confirm the public link loads without any local setup
- test at least one full review -> question -> save flow on the hosted app

## Submission Notes

For local recording, `npm run dev` is enough. For the actual submission, provide the hosted public link in addition to the repository link.

Before submission:
- keep `data/savedAnswers.json` empty or with only intentional demo records
- verify `.env` is not committed
- confirm the public link loads without requiring local setup

## Repository Structure

- `src/server.js` - Express server entry point
- `src/routes/api.js` - API endpoints and 3-agent orchestration
- `src/reviewAnalysis.js` - compatibility export surface for review intelligence
- `src/config.js` - OpenAI client configuration
- `data/savedAnswers.json` - local saved answer history
- `docs/` - demo script, architecture notes, and hackathon reference materials

## What Is Intentionally Simplified

- One polished property flow instead of broad multi-property productization
- A transparent heuristic topic taxonomy instead of a trained classifier
- Sequential agent orchestration inside one backend rather than a complex multi-agent runtime
- Local JSON persistence instead of a production database
