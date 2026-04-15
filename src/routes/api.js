import { Router } from 'express';
import fs from 'fs';
import { hasOpenAiKey, openai } from '../config.js';
import { getPropertyContext, loadPropertyDescriptions } from '../reviewAnalysis.js';
import { runGapAnalysisAgent } from '../agents/gapAnalysisAgent.js';
import { runQuestionAgent } from '../agents/questionAgent.js';
import { runIntegrationAgent } from '../agents/integrationAgent.js';
import { loadSavedAnswers, saveAnswerRecord } from '../storage/answersStore.js';

const router = Router();
const DEFAULT_PROPERTY_ID = 'db38b19b897dbece3e34919c662b3fd66d23b615395d11fb69264dd3a9b17723';

router.get('/health', (req, res) => {
  const descriptions = loadPropertyDescriptions();
  const demoProperty = getPropertyContext(descriptions, DEFAULT_PROPERTY_ID);

  res.json({
    status: 'ok',
    openAiConfigured: hasOpenAiKey,
    demoPropertyId: DEFAULT_PROPERTY_ID,
    demoProperty
  });
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

    const trimmedReview = reviewText.trim();
    const gapAnalysisAgent = runGapAnalysisAgent(propertyId, trimmedReview);
    const questionAgent = await runQuestionAgent({
      propertyId,
      reviewText: trimmedReview,
      gapAnalysisAgent,
      useOpenAi: hasOpenAiKey
    });

    res.json({
      propertyId,
      gapAnalysisAgent,
      questionAgent,
      question: questionAgent.questionText,
      questionTargetTopic: gapAnalysisAgent.targetTopic,
      recommendedGap: gapAnalysisAgent.targetTopic,
      missingTopics: gapAnalysisAgent.missingTopics,
      staleTopics: gapAnalysisAgent.staleTopics,
      sentimentSummary: gapAnalysisAgent.sentimentSummary,
      audio: questionAgent.audio,
      usedFallback: !hasOpenAiKey
    });
  } catch (error) {
    console.error('Error generating question:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/answers', async (req, res) => {
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

    const integrationAgent = await runIntegrationAgent({
      propertyId,
      originalReviewText: reviewText.trim(),
      questionText: question.trim(),
      answerText: answer.trim(),
      targetTopic: questionTargetTopic,
      useOpenAi: hasOpenAiKey
    });

    const record = {
      id: crypto.randomUUID(),
      propertyId,
      reviewText: reviewText.trim(),
      question: question.trim(),
      answer: answer.trim(),
      answerSource,
      questionTargetTopic,
      enrichedReviewSnippet: integrationAgent.enrichedReviewSnippet,
      extractedTopics: integrationAgent.extractedTopics,
      whatWeLearned: integrationAgent.whatWeLearned,
      createdAt: new Date().toISOString()
    };

    saveAnswerRecord(record);

    res.status(201).json({
      answer: record,
      integrationAgent
    });
  } catch (error) {
    console.error('Error saving answer:', error);
    res.status(500).json({ error: 'Failed to save answer.' });
  }
});

router.post('/transcribe', async (req, res) => {
  let tempPath = null;

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
    tempPath = '/tmp/audio.webm';
    fs.writeFileSync(tempPath, audioBuffer);

    const transcript = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: process.env.OPENAI_TRANSCRIPTION_MODEL || 'whisper-1'
    });

    res.json({ transcript: transcript.text });
  } catch (error) {
    console.error('Error transcribing audio:', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (tempPath && fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }
});

export default router;
