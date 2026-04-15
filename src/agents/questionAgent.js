import { openai } from '../config.js';

export async function runQuestionAgent({ propertyId, reviewText, gapAnalysisAgent, useOpenAi }) {
  if (useOpenAi) {
    return runOpenAiQuestionAgent({ propertyId, reviewText, gapAnalysisAgent });
  }

  return runFallbackQuestionAgent({ gapAnalysisAgent });
}

async function runOpenAiQuestionAgent({ propertyId, reviewText, gapAnalysisAgent }) {
  const questionText = await generateOpenAiQuestion({
    propertyId,
    reviewText,
    gapAnalysisAgent
  });

  return {
    name: 'QuestionAgent',
    questionText,
    audio: await generateQuestionAudio(questionText),
    mode: 'openai'
  };
}

function runFallbackQuestionAgent({ gapAnalysisAgent }) {
  return {
    name: 'QuestionAgent',
    questionText: generateFallbackQuestion(gapAnalysisAgent.targetTopic, gapAnalysisAgent.propertyContext),
    audio: null,
    mode: 'fallback'
  };
}

async function generateOpenAiQuestion({ propertyId, reviewText, gapAnalysisAgent }) {
  const propertyLabel = [
    gapAnalysisAgent.propertyContext.propertyName,
    gapAnalysisAgent.propertyContext.city,
    gapAnalysisAgent.propertyContext.province
  ].filter(Boolean).join(', ');

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
    messages: [{
      role: 'user',
      content: `You are the QuestionAgent for an Expedia review assistant.

Write exactly one short follow-up question for a traveler. Keep it under 15 words.
Target the chosen topic directly and avoid repeating details already in the current review.
Return only the question text.

Property: ${propertyLabel || propertyId}
Area description: ${gapAnalysisAgent.propertyContext.areaDescription || 'n/a'}
Property description: ${gapAnalysisAgent.propertyContext.propertyDescription || 'n/a'}
Popular amenities: ${gapAnalysisAgent.propertyContext.amenities.join(', ') || 'n/a'}
Gap topic: ${gapAnalysisAgent.targetTopic}
Reason: ${gapAnalysisAgent.reason}
Supporting signals: ${gapAnalysisAgent.supportingSignals.join(' ')}
Current review topics: ${gapAnalysisAgent.currentReviewTopics.join(', ') || 'none'}
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

function generateFallbackQuestion(topic, propertyContext) {
  const amenityHint = propertyContext.amenities[0] ? `, especially ${propertyContext.amenities[0].replaceAll('_', ' ')}` : '';
  const promptsByTopic = {
    cleanliness: 'How clean did the room and bathroom feel during your stay?',
    service: 'How did the staff handle check-in and any requests?',
    room_comfort: 'How comfortable was the bed, room temperature, and noise level?',
    amenities: `Which amenities worked well${amenityHint}, and which disappointed you?`,
    condition: 'What stood out about the hotel’s upkeep or maintenance?',
    location: 'How convenient was the location for your trip?',
    value: 'Did the stay feel worth the price you paid?',
    safety: 'How safe and secure did the property feel?'
  };

  return promptsByTopic[topic] ?? 'What would help another traveler understand your stay better?';
}
