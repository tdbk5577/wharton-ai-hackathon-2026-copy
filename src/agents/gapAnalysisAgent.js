import { analyzePropertyReviews, detectTopicsInText } from '../reviewAnalysis.js';
import { formatTopic } from '../review/text.js';

const FALLBACK_TOPIC_PRIORITY = ['cleanliness', 'service', 'room_comfort', 'amenities', 'condition', 'location', 'value', 'safety'];

export function runGapAnalysisAgent(propertyId, reviewText) {
  const analysis = analyzePropertyReviews(propertyId);
  const currentReviewTopics = detectTopicsInText(reviewText);
  const targetTopic = chooseQuestionTargetTopic(analysis, currentReviewTopics);
  const topicSignals = analysis.topicCoverage.find((topic) => topic.key === targetTopic);

  return {
    name: 'GapAnalysisAgent',
    targetTopic,
    reason: buildGapReason({
      targetTopic,
      topicSignals,
      currentReviewTopics,
      missingTopics: analysis.missingTopics,
      staleTopics: analysis.staleTopics
    }),
    supportingSignals: analysis.supportingSignals,
    currentReviewTopics,
    missingTopics: analysis.missingTopics,
    staleTopics: analysis.staleTopics,
    detectedTopics: analysis.detectedTopics,
    topicCoverage: analysis.topicCoverage,
    propertyContext: analysis.propertyContext,
    sentimentSummary: analysis.sentimentSummary
  };
}

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

function buildGapReason({ targetTopic, topicSignals, currentReviewTopics, missingTopics, staleTopics }) {
  if (currentReviewTopics.includes(targetTopic)) {
    return `${formatTopic(targetTopic)} is already mentioned, so the agent is seeking sharper detail instead of a new theme.`;
  }

  if (missingTopics.includes(targetTopic)) {
    return `${formatTopic(targetTopic)} is missing from this property's review history and adds net-new information.`;
  }

  if (staleTopics.includes(targetTopic)) {
    return `${formatTopic(targetTopic)} appeared in older reviews but not recently, so the property signal may be outdated.`;
  }

  if (topicSignals) {
    return `${formatTopic(targetTopic)} was chosen as the best remaining review dimension for this draft.`;
  }

  return 'The agent selected the best uncovered review topic for this draft.';
}
