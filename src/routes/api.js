import { Router } from 'express';
import fs from 'fs';
import { openai } from '../config.js';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Generate question
router.post('/generate-question', async (req, res) => {
  try {
    const { reviewText } = req.body;
    if (!reviewText) {
      return res.status(400).json({ error: 'reviewText required' });
    }

    // Generate question
    const qRes = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{
        role: 'user',
        content: `Based on this property review, generate 1 follow-up question to fill information gaps. Keep it under 15 words.\n\nReview: "${reviewText}"`
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

export default router;
