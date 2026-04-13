# Ask What Matters

Adaptive AI for smarter travel reviews. Generates personalized follow-up questions via voice to fill information gaps in property reviews.

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

## Structure

- `src/server.js` - Express server entry point
- `src/routes/api.js` - API endpoints (`/generate-question`, `/transcribe`)
- `src/config.js` - OpenAI client config
- `app/index.html` - Frontend UI

## How It Works

1. Enter a property review
2. Click "Ask Me a Question"
3. AI generates a contextual question and plays it as audio
4. Record your answer (voice or text)
5. Answer is transcribed and saved

## Deploy

```bash
# Vercel
npm i -g vercel
vercel
# Set OPENAI_API_KEY env var in dashboard
```

## Requirements

- Node.js 16+
- OpenAI API key