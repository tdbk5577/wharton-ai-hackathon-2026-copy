import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseCsv, parseJsonArray, parseRating, parseReviewDate } from './csv.js';
import { sanitizeHtmlSnippet } from './text.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DEFAULT_REVIEWS_PATH = path.resolve(__dirname, '../../data/Reviews_PROC.csv');
export const DEFAULT_DESCRIPTIONS_PATH = path.resolve(__dirname, '../../data/Description_PROC.csv');
export const SUBMITTED_REVIEWS_PATH = path.resolve(__dirname, '../../data/submittedReviews.csv');

const CSV_HEADERS = 'eg_property_id,acquisition_date,lob,rating,review_title,review_text';

let cachedReviews = null;
let cachedDescriptions = null;

export function clearReviewsCache() {
  cachedReviews = null;
}

export function loadReviews(reviewsPath = DEFAULT_REVIEWS_PATH) {
  if (reviewsPath === DEFAULT_REVIEWS_PATH && cachedReviews) {
    return cachedReviews;
  }

  const csv = fs.readFileSync(reviewsPath, 'utf8');
  const rows = parseCsv(csv);
  const [headers, ...records] = rows;

  const reviews = records
    .filter((row) => row.length > 1)
    .map((row) => normalizeReviewRow(headers, row));

  if (reviewsPath === DEFAULT_REVIEWS_PATH) {
    cachedReviews = [...reviews, ...loadSubmittedReviews()];
  }

  return reviewsPath === DEFAULT_REVIEWS_PATH ? cachedReviews : reviews;
}

export function appendSubmittedReview(propertyId, reviewText, reviewTitle = '') {
  const fileExists = fs.existsSync(SUBMITTED_REVIEWS_PATH);
  const date = new Date();
  const acquisitionDate = `${date.getMonth() + 1}/${date.getDate()}/${String(date.getFullYear()).slice(2)}`;
  const row = [
    escapeCsvField(propertyId),
    acquisitionDate,
    'HOTEL',
    '',
    escapeCsvField(reviewTitle),
    escapeCsvField(reviewText)
  ].join(',');

  if (!fileExists) {
    fs.writeFileSync(SUBMITTED_REVIEWS_PATH, CSV_HEADERS + '\n' + row, 'utf8');
  } else {
    fs.appendFileSync(SUBMITTED_REVIEWS_PATH, '\n' + row, 'utf8');
  }
}

function loadSubmittedReviews() {
  if (!fs.existsSync(SUBMITTED_REVIEWS_PATH)) return [];
  try {
    const csv = fs.readFileSync(SUBMITTED_REVIEWS_PATH, 'utf8');
    const rows = parseCsv(csv);
    const [headers, ...records] = rows;
    return records
      .filter((row) => row.length > 1)
      .map((row) => normalizeReviewRow(headers, row));
  } catch {
    return [];
  }
}

function escapeCsvField(value) {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replaceAll('"', '""') + '"';
  }
  return str;
}

export function loadPropertyDescriptions(descriptionsPath = DEFAULT_DESCRIPTIONS_PATH) {
  if (descriptionsPath === DEFAULT_DESCRIPTIONS_PATH && cachedDescriptions) {
    return cachedDescriptions;
  }

  const csv = fs.readFileSync(descriptionsPath, 'utf8');
  const rows = parseCsv(csv);
  const [headers, ...records] = rows;

  const descriptions = records
    .filter((row) => row.length > 1)
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])));

  if (descriptionsPath === DEFAULT_DESCRIPTIONS_PATH) {
    cachedDescriptions = descriptions;
  }

  return descriptions;
}

export function getReviewsForProperty(reviews, propertyId) {
  return reviews.filter((review) => review.eg_property_id === propertyId);
}

export function getPropertyContext(descriptions, propertyId) {
  const property = descriptions.find((description) => description.eg_property_id === propertyId);

  if (!property) {
    return {
      propertyName: 'Selected demo property',
      city: null,
      province: null,
      country: null,
      starRating: null,
      amenities: [],
      areaDescription: null,
      propertyDescription: null
    };
  }

  return {
    propertyName: buildPropertyName(property),
    city: property.city || null,
    province: property.province || null,
    country: property.country || null,
    starRating: property.star_rating || null,
    amenities: parseJsonArray(property.popular_amenities_list).slice(0, 6),
    areaDescription: sanitizeHtmlSnippet(property.area_description),
    propertyDescription: sanitizeHtmlSnippet(property.property_description)
  };
}

function normalizeReviewRow(headers, row) {
  const record = Object.fromEntries(headers.map((header, index) => [header, row[index] ?? '']));

  return {
    ...record,
    acquisitionDate: parseReviewDate(record.acquisition_date),
    rating: parseRating(record.rating)
  };
}

function buildPropertyName(property) {
  const locationParts = [property.city, property.province].filter(Boolean);
  if (locationParts.length > 0) {
    return locationParts.join(', ');
  }

  return property.eg_property_id;
}
