import { OpenAI } from 'openai';

const rawApiKey = String(process.env.OPENAI_API_KEY || '').trim();

function isConfiguredOpenAiKey(value) {
  if (!value) {
    return false;
  }

  if (value === 'your_api_key_here') {
    return false;
  }

  return value.startsWith('sk-');
}

export const hasOpenAiKey = isConfiguredOpenAiKey(rawApiKey);

export const openai = hasOpenAiKey
  ? new OpenAI({ apiKey: rawApiKey })
  : null;
