import { openai } from '../config.js';
import { detectTopicsInText } from '../reviewAnalysis.js';
import { formatTopic, sentenceCase, trimSentence } from '../review/text.js';

export async function runIntegrationAgent({ propertyId, originalReviewText, questionText, answerText, targetTopic, useOpenAi }) {
  if (useOpenAi) {
    return runOpenAiIntegrationAgent({ propertyId, originalReviewText, questionText, answerText, targetTopic });
  }

  return runFallbackIntegrationAgent({ originalReviewText, answerText, targetTopic });
}

async function runOpenAiIntegrationAgent({ propertyId, originalReviewText, questionText, answerText, targetTopic }) {
  const fallback = runFallbackIntegrationAgent({
    propertyId,
    originalReviewText,
    questionText,
    answerText,
    targetTopic
  });

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `You are an answer integration agent for hotel reviews.

Given the review, the follow-up question, and the traveler's answer, produce:
1. A short "whatWeLearned" summary under 22 words.
2. An "enrichedReviewSnippet" that naturally appends the new detail to the original review in 1-2 sentences.

Return strict JSON with keys: whatWeLearned, enrichedReviewSnippet.

Target topic: ${targetTopic || 'unknown'}
Original review: "${originalReviewText}"
Question: "${questionText}"
Answer: "${answerText}"`
      }],
      response_format: { type: 'json_object' }
    });

    const parsed = JSON.parse(response.choices[0].message.content);
    return {
      ...fallback,
      whatWeLearned: String(parsed.whatWeLearned || fallback.whatWeLearned).trim(),
      enrichedReviewSnippet: String(parsed.enrichedReviewSnippet || fallback.enrichedReviewSnippet).trim(),
      mode: 'openai'
    };
  } catch (error) {
    console.error('Falling back to local integration agent:', error);
    return fallback;
  }
}

function runFallbackIntegrationAgent({ originalReviewText, answerText, targetTopic }) {
  const extractedTopics = Array.from(new Set([
    ...(targetTopic ? [targetTopic] : []),
    ...detectTopicsInText(answerText)
  ]));
  const learnedTopic = formatTopic(targetTopic || extractedTopics[0] || 'guest_detail');
  const normalizedAnswer = sentenceCase(answerText);

  return {
    name: 'IntegrationAgent',
    whatWeLearned: `${learnedTopic} detail captured: ${trimSentence(normalizedAnswer, 90)}`,
    extractedTopics,
    enrichedReviewSnippet: `${sentenceCase(originalReviewText)} Additional guest detail: ${normalizedAnswer}`,
    mode: 'fallback'
  };
}
