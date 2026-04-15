import { OpenAI } from 'openai';

export const hasOpenAiKey = Boolean(process.env.OPENAI_API_KEY);

export const openai = hasOpenAiKey
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;
