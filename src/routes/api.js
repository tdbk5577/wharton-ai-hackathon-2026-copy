import { Router } from 'express';
import fs from 'fs';
import { openai } from '../config.js';
import { analyzePropertyReviews, detectTopicsInText } from '../reviewAnalysis.js';

const router = Router();
const DEFAULT_PROPERTY_ID = 'db38b19b897dbece3e34919c662b3fd66d23b615395d11fb69264dd3a9b17723';
const FALLBACK_TOPIC_PRIORITY = ['cleanliness', 'service', 'room_comfort', 'amenities', 'condition', 'location', 'value', 'safety'];

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Generate question
router.post('/generate-question', async (req, res) => {
  try {
    const { propertyId = DEFAULT_PROPERTY_ID, reviewText } = req.body;
    if (!reviewText) {
      return res.status(400).json({ error: 'reviewText required' });
    }

    const analysis = analyzePropertyReviews(propertyId);
    const currentReviewTopics = detectTopicsInText(reviewText);
    const questionTargetTopic = chooseQuestionTargetTopic(analysis, currentReviewTopics);

    // Generate question
    const qRes = await openai.chat.completions.create({
      model: 'gpt-4',
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

    const question = qRes.choices[0].message.content.trim();

    // Generate audio
    const audioRes = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: question
    });

    const buffer = await audioRes.arrayBuffer();
    const base64Audio = Buffer.from(buffer).toString('base64');

    res.json({
      question,
      recommendedGap: analysis.recommendedGap,
      missingTopics: analysis.missingTopics,
      staleTopics: analysis.staleTopics,
      sentimentSummary: analysis.sentimentSummary,
      detectedTopics: analysis.detectedTopics,
      currentReviewTopics,
      questionTargetTopic,
      audio: `data:audio/mpeg;base64,${base64Audio}`
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Transcribe audio
router.post('/transcribe', async (req, res) => {
  try {
    const { audioBase64 } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'audioBase64 required' });
    }

    const audioBuffer = Buffer.from(audioBase64.split(',')[1], 'base64');
    
    // Create temp file
    const tempPath = '/tmp/audio.wav';
    fs.writeFileSync(tempPath, audioBuffer);

    // Transcribe
    const transcript = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: 'whisper-1'
    });

    fs.unlinkSync(tempPath);

    res.json({ transcript: transcript.text });

  } catch (error) {
    console.error('Error:', error);
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

  // If the property has no missing/stale topic, still avoid repeating the
  // current reviewer by asking about another high-value review dimension.
  return FALLBACK_TOPIC_PRIORITY.find((topic) => !covered.has(topic)) ?? analysis.recommendedGap;
}

export default router;
