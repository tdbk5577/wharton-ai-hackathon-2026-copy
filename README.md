# Ask What Matters

Adaptive AI for smarter travel reviews. Generates personalized follow-up questions, plays them back with audio when OpenAI is configured, captures voice or text responses, and saves answers for the current property.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
echo "OPENAI_API_KEY=sk-..." > .env

# Run locally
npm run dev
# Open http://localhost:3000
```

If `OPENAI_API_KEY` is missing, the app still runs in fallback mode:
- question generation uses local topic heuristics
- audio playback is disabled
- transcription returns an explanatory error instead of hanging

## Structure

- `src/server.js` - Express server entry point
- `src/routes/api.js` - API endpoints (`/generate-question`, `/transcribe`, `/answers`)
- `src/config.js` - OpenAI client config
- `app/index.html` - Frontend UI
- `data/savedAnswers.json` - local persistence for captured answers

## How It Works

1. Enter a property review
2. Click "Ask Me a Question"
3. AI generates a contextual question and plays it as audio
4. Record your answer (voice or text)
5. Answer is saved to the backend and shown in the UI

## API Summary

- `GET /api/health` - backend and OpenAI-config status
- `POST /api/generate-question` - review-to-question generation plus review-gap analysis
- `POST /api/transcribe` - voice transcription with OpenAI Whisper
- `GET /api/answers` - list saved answers for the demo property
- `POST /api/answers` - save the generated follow-up answer

## Deploy

```bash
# Vercel
npm i -g vercel
vercel
# Set OPENAI_API_KEY env var in dashboard
```

## Requirements

- Node.js 18+
- OpenAI API key for full voice + AI mode
