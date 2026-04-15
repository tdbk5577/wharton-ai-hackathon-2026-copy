import { DEFAULT_RECENT_MONTHS, TOPIC_PRIORITY, TOPIC_TAXONOMY } from './constants.js';
import { getPropertyContext, getReviewsForProperty, loadPropertyDescriptions, loadReviews } from './data.js';
import { parseReviewDate } from './csv.js';
import { normalizeText } from './text.js';

export function analyzePropertyReviews(propertyId, options = {}) {
  const reviews = loadReviews(options.reviewsPath);
  const descriptions = loadPropertyDescriptions(options.descriptionsPath);
  const propertyReviews = getReviewsForProperty(reviews, propertyId);
  const propertyContext = getPropertyContext(descriptions, propertyId);

  if (propertyReviews.length === 0) {
    return {
      propertyId,
      propertyContext,
      reviewCount: 0,
      recentReviewCount: 0,
      oldReviewCount: 0,
      detectedTopics: [],
      missingTopics: TOPIC_PRIORITY,
      staleTopics: [],
      recommendedGap: 'cleanliness',
      topicCoverage: buildTopicCoverage([], [], []),
      supportingSignals: [],
      sentimentSummary: 'No reviews found for this property yet.'
    };
  }

  const sortedReviews = sortReviewsByDate(propertyReviews);
  const { recentReviews, oldReviews, cutoffDate, referenceDate } = splitReviewsByRecency(sortedReviews, {
    recentMonths: options.recentMonths,
    referenceDate: options.referenceDate
  });

  const topicCoverage = buildTopicCoverage(sortedReviews, recentReviews, oldReviews);
  const detectedTopics = topicCoverage.filter((topic) => topic.allCount > 0).map((topic) => topic.key);
  const recentTopics = topicCoverage.filter((topic) => topic.recentCount > 0).map((topic) => topic.key);
  const oldTopics = topicCoverage.filter((topic) => topic.oldCount > 0).map((topic) => topic.key);
  const { missingTopics, staleTopics, recommendedGap } = findInformationGaps({
    detectedTopics,
    recentTopics,
    oldTopics
  });

  return {
    propertyId,
    propertyContext,
    reviewCount: sortedReviews.length,
    recentReviewCount: recentReviews.length,
    oldReviewCount: oldReviews.length,
    cutoffDate: formatDate(cutoffDate),
    referenceDate: formatDate(referenceDate),
    detectedTopics,
    missingTopics,
    staleTopics,
    recommendedGap,
    topicCoverage,
    supportingSignals: summarizeSupportingSignals(topicCoverage, recommendedGap, propertyContext),
    sentimentSummary: summarizeSentiment(sortedReviews)
  };
}

export function sortReviewsByDate(reviews) {
  return [...reviews].sort((a, b) => {
    const aTime = a.acquisitionDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bTime = b.acquisitionDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });
}

export function splitReviewsByRecency(reviews, options = {}) {
  const recentMonths = options.recentMonths ?? DEFAULT_RECENT_MONTHS;
  const validDates = reviews
    .map((review) => review.acquisitionDate)
    .filter((date) => date instanceof Date && !Number.isNaN(date.getTime()));

  const referenceDate = options.referenceDate
    ? parseReviewDate(options.referenceDate)
    : getLatestDate(validDates);

  const cutoffDate = subtractMonths(referenceDate, recentMonths);
  const recentReviews = [];
  const oldReviews = [];

  for (const review of reviews) {
    if (review.acquisitionDate && review.acquisitionDate >= cutoffDate) {
      recentReviews.push(review);
    } else {
      oldReviews.push(review);
    }
  }

  return { recentReviews, oldReviews, cutoffDate, referenceDate };
}

export function detectTopicsInReviews(reviews) {
  const topicKeys = new Set();

  for (const review of reviews) {
    for (const topic of detectTopicsInText(`${review.review_title} ${review.review_text}`)) {
      topicKeys.add(topic);
    }
  }

  return sortTopics([...topicKeys]);
}

export function detectTopicsInText(text) {
  const normalized = normalizeText(text);

  return TOPIC_TAXONOMY
    .filter((topic) => topic.keywords.some((keyword) => normalized.includes(keyword)))
    .map((topic) => topic.key);
}

export function findInformationGaps({ detectedTopics, recentTopics, oldTopics }) {
  const detected = new Set(detectedTopics);
  const recent = new Set(recentTopics);
  const old = new Set(oldTopics);

  const missingTopics = TOPIC_PRIORITY.filter((topic) => !detected.has(topic));
  const staleTopics = TOPIC_PRIORITY.filter((topic) => old.has(topic) && !recent.has(topic));
  const recommendedGap = staleTopics[0] ?? missingTopics[0] ?? findLeastRepresentedFallback(recentTopics);

  return { missingTopics, staleTopics, recommendedGap };
}

export function summarizeSentiment(reviews) {
  const ratings = reviews
    .map((review) => review.rating?.overall)
    .filter((rating) => typeof rating === 'number' && rating > 0);

  const avgRating = ratings.length > 0
    ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
    : null;

  const allText = normalizeText(reviews.map((review) => review.review_text).join(' '));
  const negativeSignals = countKeywordHits(allText, ['dirty', 'rude', 'broken', 'noise', 'loud', 'unsafe', 'worst', 'terrible']);
  const positiveSignals = countKeywordHits(allText, ['clean', 'friendly', 'helpful', 'comfortable', 'great', 'excellent', 'nice', 'quiet']);

  if (avgRating === null) {
    return 'Sentiment is unclear because these reviews do not include usable overall ratings.';
  }

  const ratingText = `Average overall rating is ${avgRating.toFixed(1)}/5 across ${ratings.length} rated reviews.`;

  if (avgRating >= 4 && positiveSignals >= negativeSignals) {
    return `${ratingText} Review sentiment is mostly positive.`;
  }

  if (avgRating <= 2.5 || negativeSignals > positiveSignals) {
    return `${ratingText} Review sentiment shows notable guest concerns.`;
  }

  return `${ratingText} Review sentiment is mixed, so follow-up questions should clarify specifics.`;
}

function buildTopicCoverage(allReviews, recentReviews, oldReviews) {
  return TOPIC_TAXONOMY.map((topic) => {
    const allCount = countReviewsMatchingTopic(allReviews, topic.key);
    const recentCount = countReviewsMatchingTopic(recentReviews, topic.key);
    const oldCount = countReviewsMatchingTopic(oldReviews, topic.key);

    return {
      key: topic.key,
      label: topic.label,
      allCount,
      recentCount,
      oldCount,
      status: allCount === 0 ? 'missing' : (oldCount > 0 && recentCount === 0 ? 'stale' : 'covered')
    };
  });
}

function summarizeSupportingSignals(topicCoverage, recommendedGap, propertyContext) {
  const selected = topicCoverage.find((topic) => topic.key === recommendedGap);
  const amenityHint = propertyContext.amenities.length > 0
    ? `Property context highlights ${propertyContext.amenities.slice(0, 3).join(', ')}.`
    : null;

  return [
    selected
      ? `${selected.label} appears in ${selected.allCount} historical reviews and ${selected.recentCount} recent reviews.`
      : null,
    selected?.status === 'missing'
      ? `This topic is missing from the property's review history, so asking about it adds net-new detail.`
      : null,
    selected?.status === 'stale'
      ? `This topic appeared in older reviews but not in the last ${DEFAULT_RECENT_MONTHS} months, so it may be outdated.`
      : null,
    amenityHint
  ].filter(Boolean);
}

function countReviewsMatchingTopic(reviews, topicKey) {
  return reviews.reduce((count, review) => {
    const topics = detectTopicsInText(`${review.review_title} ${review.review_text}`);
    return topics.includes(topicKey) ? count + 1 : count;
  }, 0);
}

function subtractMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() - months);
  return result;
}

function getLatestDate(dates) {
  if (dates.length === 0) {
    return new Date();
  }

  return new Date(Math.max(...dates.map((date) => date.getTime())));
}

function sortTopics(topicKeys) {
  return TOPIC_PRIORITY.filter((topic) => topicKeys.includes(topic));
}

function findLeastRepresentedFallback(recentTopics) {
  const recent = new Set(recentTopics);
  return TOPIC_PRIORITY.find((topic) => !recent.has(topic)) ?? TOPIC_PRIORITY[0];
}

function countKeywordHits(text, keywords) {
  return keywords.reduce((count, keyword) => (
    text.includes(keyword) ? count + 1 : count
  ), 0);
}

function formatDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}
