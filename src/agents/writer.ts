// ============================================================
// CONTENT WRITER AGENT
// SEO + AEO optimized content with FAQ and structured answers
// ============================================================

import type { WriterOutput, ResearchOutput } from '../types';

const SYSTEM_PROMPT = `You are an expert SEO + AEO Content Writer.
Given a keyword and research data, produce a full article in JSON:
{
  "title": "string (60 chars max, keyword-first)",
  "meta_description": "string (155 chars max)",
  "direct_answer": "string (2-3 sentences, AEO format — direct, factual, citation-worthy)",
  "outline": [{"heading": "string", "type": "h2|h3", "content": "string (2-3 sentences)"}],
  "faq": [{"question": "string", "answer": "string (concise, 2-4 sentences)"}],
  "word_count": number,
  "reading_level": "string",
  "schema_type": "Article|HowTo|FAQ|BreadcrumbList"
}
Include at least 4 outline sections and 4 FAQs.
Make content genuinely valuable — not generic.
Respond ONLY with valid JSON.`;

export async function runWriter(keyword: string, research: ResearchOutput): Promise<WriterOutput> {
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
      messages: [{
        role: 'user',
        content: `Write a full SEO+AEO article for: "${keyword}"\nResearch context: ${JSON.stringify(research)}`,
      }],
    }),
  });

  const data = await response.json();
  const text = data.content?.map((b: any) => b.text || '').join('') || '';
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}
