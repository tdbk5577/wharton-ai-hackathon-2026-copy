import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ANSWERS_PATH = path.resolve(__dirname, '../../data/savedAnswers.json');

export function loadSavedAnswers() {
  if (!fs.existsSync(ANSWERS_PATH)) {
    return [];
  }

  try {
    return JSON.parse(fs.readFileSync(ANSWERS_PATH, 'utf8'));
  } catch {
    return [];
  }
}

export function saveAnswerRecord(record) {
  const savedAnswers = loadSavedAnswers();
  savedAnswers.unshift(record);
  fs.writeFileSync(ANSWERS_PATH, JSON.stringify(savedAnswers, null, 2));
}
