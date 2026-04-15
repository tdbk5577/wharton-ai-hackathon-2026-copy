import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { hasOpenAiKey, openai } from '../config.js';
import { analyzePropertyReviews, detectTopicsInText } from '../reviewAnalysis.js';

const router = Router();
const DEFAULT_PROPERTY_ID = 'db38b19b897dbece3e34919c662b3fd66d23b615395d11fb69264dd3a9b17723';
const FALLBACK_TOPIC_PRIORITY = ['cleanliness', 'service', 'room_comfort', 'amenities', 'condition', 'location', 'value', 'safety'];
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ANSWERS_PATH = path.resolve(__dirname, '../../data/savedAnswers.json');

router.get('/health', (req, res) => {
  res.json({ status: 'ok', openAiConfigured: hasOpenAiKey });
});

router.get('/answers', (req, res) => {
  try {
    const { propertyId = DEFAULT_PROPERTY_ID } = req.query;
    const answers = loadSavedAnswers().filter((entry) => entry.propertyId === propertyId);
    res.json({ answers });
  } catch (error) {
    console.error('Error reading answers:', error);
    res.status(500).json({ error: 'Failed to load saved answers.' });
  }
});

router.post('/generate-question', async (req, res) => {
  try {
    const { propertyId = DEFAULT_PROPERTY_ID, reviewText } = req.body;
    if (!reviewText) {
      return res.status(400).json({ error: 'reviewText required' });
    }

    const analysis = analyzePropertyReviews(propertyId);
    const currentReviewTopics = detectTopicsInText(reviewText);
    const questionTargetTopic = chooseQuestionTargetTopic(analysis, currentReviewTopics);

    const question = hasOpenAiKey
      ? await generateOpenAiQuestion({
        analysis,
        currentReviewTopics,
        questionTargetTopic,
        reviewText
      })
      : generateFallbackQuestion(questionTargetTopic);

    const audio = hasOpenAiKey ? await generateQuestionAudio(question) : null;

    res.json({
      question,
      recommendedGap: analysis.recommendedGap,
      missingTopics: analysis.missingTopics,
      staleTopics: analysis.staleTopics,
      sentimentSummary: analysis.sentimentSummary,
      detectedTopics: analysis.detectedTopics,
      currentReviewTopics,
      questionTargetTopic,
      audio,
      usedFallback: !hasOpenAiKey
    });
  } catch (error) {
    console.error('Error generating question:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/answers', (req, res) => {
  try {
    const {
      propertyId = DEFAULT_PROPERTY_ID,
      reviewText,
      question,
      answer,
      answerSource = 'text',
      questionTargetTopic = null
    } = req.body;

    if (!reviewText || !question || !answer) {
      return res.status(400).json({ error: 'reviewText, question, and answer are required.' });
    }

    const record = {
      id: crypto.randomUUID(),
      propertyId,
      reviewText: reviewText.trim(),
      question: question.trim(),
      answer: answer.trim(),
      answerSource,
      questionTargetTopic,
      createdAt: new Date().toISOString()
    };

    const savedAnswers = loadSavedAnswers();
    savedAnswers.unshift(record);
    persistSavedAnswers(savedAnswers);

    res.status(201).json({ answer: record });
  } catch (error) {
    console.error('Error saving answer:', error);
    res.status(500).json({ error: 'Failed to save answer.' });
  }
});

router.post('/transcribe', async (req, res) => {
  try {
    const { audioBase64 } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'audioBase64 required' });
    }

    if (!hasOpenAiKey || !openai) {
      return res.status(503).json({ error: 'Transcription requires OPENAI_API_KEY.' });
    }

    const encodedAudio = audioBase64.includes(',') ? audioBase64.split(',')[1] : audioBase64;
    const audioBuffer = Buffer.from(encodedAudio, 'base64');
    const tempPath = '/tmp/audio.webm';
    fs.writeFileSync(tempPath, audioBuffer);

    const transcript = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: process.env.OPENAI_TRANSCRIPTION_MODEL || 'whisper-1'
    });

    fs.unlinkSync(tempPath);
    res.json({ transcript: transcript.text });
  } catch (error) {
    console.error('Error transcribing audio:', error);
    res.status(500).json({ error: error.message });
  }
});

function chooseQuestionTargetTopic(analysis, currentReviewTopics) {
  const covered = new Set(currentReviewTopics);
  const gapCandidates = [
    analysis.recommendedGap,
    ...analysis.staleTopics,
    ...analysis.missingTopics
  ].filter(Boolean);

  const uncoveredGap = gapCandidates.find((topic) => !covered.has(topic));
  if (uncoveredGap) {
    return uncoveredGap;
  }

  return FALLBACK_TOPIC_PRIORITY.find((topic) => !covered.has(topic)) ?? analysis.recommendedGap;
}

async function generateOpenAiQuestion({ analysis, currentReviewTopics, questionTargetTopic, reviewText }) {
  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
    messages: [{
      role: 'user',
      content: `You help hotel guests leave more useful reviews.

Generate 1 short targeted follow-up question based on the current review and the property's historical review intelligence.
The question should directly target the selected topic.
Avoid asking about topics already covered in the current review unless there is no better gap.
Keep it under 15 words. Return only the question text.

Property review intelligence:
- Recommended gap: ${analysis.recommendedGap}
- Selected topic for this reviewer: ${questionTargetTopic}
- Missing topics: ${analysis.missingTopics.join(', ') || 'none'}
- Stale topics: ${analysis.staleTopics.join(', ') || 'none'}
- Detected topics: ${analysis.detectedTopics.join(', ') || 'none'}
- Sentiment summary: ${analysis.sentimentSummary}
- Topics already covered in current review: ${currentReviewTopics.join(', ') || 'none'}

Current review: "${reviewText}"`
    }],
    max_tokens: 50
  });

  return response.choices[0].message.content.trim();
}

async function generateQuestionAudio(question) {
  const audioResponse = await openai.audio.speech.create({
    model: process.env.OPENAI_TTS_MODEL || 'tts-1',
    voice: process.env.OPENAI_TTS_VOICE || 'alloy',
    input: question
  });

  const buffer = await audioResponse.arrayBuffer();
  const base64Audio = Buffer.from(buffer).toString('base64');
  return `data:audio/mpeg;base64,${base64Audio}`;
}

function generateFallbackQuestion(topic) {
  const promptsByTopic = {
    cleanliness: 'How clean did the room and bathroom feel during your stay?',
    service: 'How did the staff handle check-in and any requests?',
    room_comfort: 'How comfortable was the room, bed, and noise level?',
    amenities: 'Which amenities worked well, and which ones disappointed you?',
    condition: 'What stood out about the hotel’s upkeep or maintenance?',
    location: 'How convenient was the location for your trip?',
    value: 'Did the stay feel worth the price you paid?',
    safety: 'How safe and secure did the property feel?'
  };

  return promptsByTopic[topic] ?? 'What would help another traveler understand your stay better?';
}

function loadSavedAnswers() {
  if (!fs.existsSync(ANSWERS_PATH)) {
    return [];
  }

  try {
    return JSON.parse(fs.readFileSync(ANSWERS_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function persistSavedAnswers(savedAnswers) {
  fs.writeFileSync(ANSWERS_PATH, JSON.stringify(savedAnswers, null, 2));
}

export default router;
