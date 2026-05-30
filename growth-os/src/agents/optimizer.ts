// ============================================================
// SEO/AEO OPTIMIZER AGENT
// Headings, schema readiness, answer-engine compatibility
// ============================================================

import type { OptimizerOutput, WriterOutput } from '../types';

const SYSTEM_PROMPT = `You are the SEO/AEO Optimizer Agent.
Given article content, return optimization report JSON:
{
  "optimized_title": "string",
  "optimized_meta": "string",
  "h1_tag": "string",
  "keyword_density": number,
  "readability_score": number,
  "aeo_signals": {
    "has_direct_answer": boolean,
    "has_faq_schema": boolean,
    "has_structured_headings": boolean,
    "answer_engine_ready": boolean,
    "featured_snippet_potential": "high|medium|low"
  },
  "seo_signals": {
    "title_optimized": boolean,
    "meta_optimized": boolean,
    "internal_link_opportunities": ["string"],
    "semantic_keywords": ["string"]
  },
  "improvements": ["string"],
  "optimization_score": number
}
Respond ONLY with valid JSON.`;

export async function runOptimizer(keyword: string, content: WriterOutput): Promise<OptimizerOutput> {
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
        content: `Optimize this content for SEO and AEO:\nKeyword: ${keyword}\nTitle: ${content.title}\nContent: ${JSON.stringify(content)}`,
      }],
    }),
  });

  const data = await response.json();
  const text = data.content?.map((b: any) => b.text || '').join('') || '';
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}
