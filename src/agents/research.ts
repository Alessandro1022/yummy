// ============================================================
// RESEARCH AGENT
// Keyword intent analysis, topic clustering, competitor gaps
// ============================================================

import type { ResearchOutput } from '../types';

const SYSTEM_PROMPT = `You are the Research Agent in a Growth OS system.
Given a keyword, output JSON:
{
  "keyword": "string",
  "search_volume": "string",
  "difficulty": number,
  "intent": "informational|commercial|transactional|navigational",
  "related_keywords": ["string"],
  "topic_clusters": ["string"],
  "target_audience": "string",
  "content_angle": "string",
  "competitor_gaps": ["string"]
}
Respond ONLY with valid JSON.`;

export async function runResearch(keyword: string): Promise<ResearchOutput> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Research this keyword deeply: "${keyword}"` }],
    }),
  });

  const data = await response.json();
  const text = data.content?.map((b: any) => b.text || '').join('') || '';
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}
