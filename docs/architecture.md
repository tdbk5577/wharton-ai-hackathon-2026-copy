# System Architecture: Adaptive AI Travel Review System

## High-Level Architecture

```
┌──────────────────────────────────────────┐
│      User Interface (Web Browser)         │
│  - Property review form                   │
│  - Voice question playback (audio tag)    │
│  - Voice recording + text input           │
└────────────────┬─────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────┐
│    Simple Backend API (Express/FastAPI)  │
│  - /generate-question                    │
│  - /transcribe                            │
└─────┬──────────────────────────┬──────────┘
      │                          │
      ▼                          ▼
┌──────────────────┐      ┌──────────────────┐
│  OpenAI ChatGPT  │      │  OpenAI TTS/STT  │
│  - Gap detection │      │  - Speech gen    │
│  - Questions     │      │  - Transcribe    │
└──────────────────┘      └──────────────────┘
```

## Core Components

### 1. **Frontend (Single HTML Page)**
- Property review form
- Audio player for AI questions
- Voice recording button + text input fallback
- Submit button

### 2. **Backend API (Single Server)**
Two simple endpoints:
- `POST /generate-question`: Takes property context, returns audio + question text
- `POST /transcribe`: Takes voice audio, returns transcription

### 3. **OpenAI APIs**
- **ChatGPT**: Identify gaps in review data, generate 1-2 follow-up questions
- **TTS**: Convert question text to speech (audio)
- **Whisper**: Convert user voice to text (optional—Web Speech API is simpler)

## MVP Flow (Simplified)

```
User enters review text
        │
        ▼
Click "Get a question"
        │
        ├─ Backend: Send review to OpenAI ChatGPT
        ├─ ChatGPT: Identify gap, return 1-2 questions
        ├─ Backend: Send question to OpenAI TTS
        ├─ TTS: Return audio
        └─ Frontend: Play audio + show text
        │
        ▼
User responds (voice or text)
        │
        ├─ If voice: Convert to text (Web Speech API or OpenAI Whisper)
        └─ If text: Direct input
        │
        ▼
Save answer to review
```

## MVP Implementation (Phase 1 Only)

Priority order:
1. ✅ Frontend: Simple form (review text input + button)
2. ✅ Backend: `/generate-question` endpoint (OpenAI ChatGPT + TTS)
3. ✅ Backend: `/transcribe` endpoint (Web Speech API or Whisper)
4. ✅ Audio playback in browser
5. ✅ Voice input capture + transcription
6. ✅ Save answer to review

**That's it.** Ship with this for the hackathon. Polish later.

## Technology Stack

| Component | Choice | Why |
|-----------|--------|-----|
| **Frontend** | HTML + React (or vanilla JS) | Simple, fast |
| **Backend** | Node.js + Express | ~50 lines of code |
| **Question Gen** | OpenAI ChatGPT | Already have key |
| **Voice Gen** | OpenAI TTS | No extra infra |
| **Voice Input** | Web Speech API (browser) | No backend needed |
| **Hosting** | Vercel or Replit | Serverless, free tier |

## OpenAI APIs Used

### ChatGPT (Question Generation)
```javascript
// Identify gaps in review, generate 1 question
const q = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{role: 'user', content: `Review: "${review}"\n\nGenerate 1 follow-up question.`}],
  max_tokens: 50
});
```

### Text-to-Speech (Question Audio)
```javascript
// Convert question to audio
const audio = await openai.audio.speech.create({
  model: 'tts-1',
  voice: 'alloy',
  input: question
});
```

### Whisper (Optional: Transcription)
```javascript
// Transcribe user voice (if not using Web Speech API)
const transcript = await openai.audio.transcriptions.create({
  file: audioFile,
  model: 'whisper-1'
});
```

## Key Constraints

1. **API Quota**: Monitor OpenAI usage (no limits but judged on cost efficiency)
2. **Latency**: TTS adds ~1-2 sec; acceptable for MVP
3. **Fallbacks**: Always allow text input + text display
4. **No auth needed**: Simple session-less design

## Security

- **Never commit API keys** → Use `.env` + `.gitignore`
- **No stored audio** → Only store text answers
- **No authentication** → Simple prototype

## Success Criteria

- ✅ User can enter property review
- ✅ Click button → AI generates 1-2 relevant questions
- ✅ Hear questions play via audio + see text
- ✅ Record voice response OR type text
- ✅ Answer saved to review
- ✅ Works in browser (Chrome, Safari, Firefox)

## Next Steps

1. Set up Express backend with `/generate-question` endpoint
2. Wire up OpenAI ChatGPT (question gen) + TTS (audio)
3. Build simple HTML form + audio player
4. Add Web Speech API for voice input
5. Test end-to-end
6. Deploy to Vercel/Replit

**Estimated time to MVP: 4-6 hours**
