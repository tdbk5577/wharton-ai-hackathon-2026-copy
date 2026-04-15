import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_REVIEWS_PATH = path.resolve(__dirname, '../data/Reviews_PROC.csv');
const DEFAULT_RECENT_MONTHS = 12;

// A compact, demo-friendly taxonomy for the Expedia review challenge.
// Each topic maps to words travelers naturally use when describing that area.
export const TOPIC_TAXONOMY = [
  {
    key: 'cleanliness',
    label: 'Cleanliness',
    keywords: ['clean', 'dirty', 'spotless', 'stain', 'smell', 'odor', 'mold', 'dust', 'bathroom', 'housekeeping']
  },
  {
    key: 'service',
    label: 'Staff and service',
    keywords: ['staff', 'service', 'front desk', 'manager', 'helpful', 'friendly', 'rude', 'check in', 'check-in']
  },
  {
    key: 'location',
    label: 'Location and access',
    keywords: ['location', 'walk', 'near', 'close', 'airport', 'downtown', 'beach', 'train', 'parking', 'traffic']
  },
  {
    key: 'room_comfort',
    label: 'Room comfort',
    keywords: ['room', 'bed', 'comfortable', 'uncomfortable', 'noise', 'quiet', 'loud', 'ac', 'air conditioning', 'temperature']
  },
  {
    key: 'amenities',
    label: 'Amenities',
    keywords: ['pool', 'spa', 'hot tub', 'gym', 'fitness', 'wifi', 'internet', 'restaurant', 'bar', 'breakfast']
  },
  {
    key: 'condition',
    label: 'Property condition',
    keywords: ['old', 'new', 'renovated', 'remodel', 'broken', 'maintenance', 'elevator', 'run down', 'out of order']
  },
  {
    key: 'value',
    label: 'Value for money',
    keywords: ['price', 'value', 'expensive', 'cheap', 'worth', 'overpriced', 'fee', 'charge', 'cost']
  },
  {
    key: 'safety',
    label: 'Safety and trust',
    keywords: ['safe', 'unsafe', 'security', 'police', 'scam', 'theft', 'stolen', 'lock', 'sketchy']
  }
];

const TOPIC_PRIORITY = [
  'cleanliness',
  'service',
  'room_comfort',
  'amenities',
  'condition',
  'location',
  'value',
  'safety'
];

/**
 * Main entry point for the backend.
 * Returns a structured review intelligence summary for one property.
 */
export function analyzePropertyReviews(propertyId, options = {}) {
  const reviews = loadReviews(options.reviewsPath);
  const propertyReviews = getReviewsForProperty(reviews, propertyId);

  if (propertyReviews.length === 0) {
    return {
      propertyId,
      reviewCount: 0,
      recentReviewCount: 0,
      oldReviewCount: 0,
      detectedTopics: [],
      missingTopics: TOPIC_PRIORITY,
      staleTopics: [],
      recommendedGap: 'cleanliness',
      sentimentSummary: 'No reviews found for this property yet.'
    };
  }

  const sortedReviews = sortReviewsByDate(propertyReviews);
  const { recentReviews, oldReviews, cutoffDate, referenceDate } = splitReviewsByRecency(sortedReviews, {
    recentMonths: options.recentMonths,
    referenceDate: options.referenceDate
  });

  const detectedTopics = detectTopicsInReviews(sortedReviews);
  const recentTopics = detectTopicsInReviews(recentReviews);
  const oldTopics = detectTopicsInReviews(oldReviews);
  const { missingTopics, staleTopics, recommendedGap } = findInformationGaps({
    detectedTopics,
    recentTopics,
    oldTopics
  });

  return {
    propertyId,
    reviewCount: sortedReviews.length,
    recentReviewCount: recentReviews.length,
    oldReviewCount: oldReviews.length,
    cutoffDate: formatDate(cutoffDate),
    referenceDate: formatDate(referenceDate),
    detectedTopics,
    missingTopics,
    staleTopics,
    recommendedGap,
    sentimentSummary: summarizeSentiment(sortedReviews)
  };
}

/**
 * Read and parse the processed reviews CSV.
 * This parser handles quoted fields and escaped quotes without adding a dependency.
 */
export function loadReviews(reviewsPath = DEFAULT_REVIEWS_PATH) {
  const csv = fs.readFileSync(reviewsPath, 'utf8');
  const rows = parseCsv(csv);
  const [headers, ...records] = rows;

  return records
    .filter((row) => row.length > 1)
    .map((row) => normalizeReviewRow(headers, row));
}

/**
 * Keep only the reviews for a single Expedia property id.
 */
export function getReviewsForProperty(reviews, propertyId) {
  return reviews.filter((review) => review.eg_property_id === propertyId);
}

/**
 * Sort oldest to newest. Invalid dates are pushed to the end.
 */
export function sortReviewsByDate(reviews) {
  return [...reviews].sort((a, b) => {
    const aTime = a.acquisitionDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bTime = b.acquisitionDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });
}

/**
 * Split reviews into recent and old buckets.
 * By default, "recent" means within the last 12 months from the latest review date.
 */
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

/**
 * Detect topics mentioned across a list of reviews using simple keyword matching.
 */
export function detectTopicsInReviews(reviews) {
  const topicKeys = new Set();

  for (const review of reviews) {
    for (const topic of detectTopicsInText(`${review.review_title} ${review.review_text}`)) {
      topicKeys.add(topic);
    }
  }

  return sortTopics([...topicKeys]);
}

/**
 * Detect topics in one text block. Matching is intentionally transparent for demo use.
 */
export function detectTopicsInText(text) {
  const normalized = normalizeText(text);

  return TOPIC_TAXONOMY
    .filter((topic) => topic.keywords.some((keyword) => normalized.includes(keyword)))
    .map((topic) => topic.key);
}

/**
 * Missing topics were never mentioned. Stale topics were mentioned before but not recently.
 * The recommended gap prefers stale topics, then missing high-priority topics.
 */
export function findInformationGaps({ detectedTopics, recentTopics, oldTopics }) {
  const detected = new Set(detectedTopics);
  const recent = new Set(recentTopics);
  const old = new Set(oldTopics);

  const missingTopics = TOPIC_PRIORITY.filter((topic) => !detected.has(topic));
  const staleTopics = TOPIC_PRIORITY.filter((topic) => old.has(topic) && !recent.has(topic));
  const recommendedGap = staleTopics[0] ?? missingTopics[0] ?? findLeastRepresentedFallback(recentTopics);

  return { missingTopics, staleTopics, recommendedGap };
}

/**
 * Lightweight sentiment summary from structured rating plus a few obvious text signals.
 */
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

function normalizeReviewRow(headers, row) {
  const record = Object.fromEntries(headers.map((header, index) => [header, row[index] ?? '']));

  return {
    ...record,
    acquisitionDate: parseReviewDate(record.acquisition_date),
    rating: parseRating(record.rating)
  };
}

function parseCsv(csv) {
  const rows = [];
  let row = [];
  let value = '';
  let inQuotes = false;

  for (let i = 0; i < csv.length; i += 1) {
    const char = csv[i];
    const nextChar = csv[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(value);
      value = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i += 1;
      }
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
    } else {
      value += char;
    }
  }

  if (value || row.length > 0) {
    row.push(value);
    rows.push(row);
  }

  return rows;
}

function parseReviewDate(value) {
  if (value instanceof Date) {
    return value;
  }

  if (!value) {
    return null;
  }

  const [month, day, year] = String(value).split('/').map(Number);
  if (!month || !day || !year) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const fullYear = year < 100 ? 2000 + year : year;
  return new Date(fullYear, month - 1, day);
}

function parseRating(value) {
  if (!value) {
    return {};
  }

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
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
