// ============================================================
// QUALITY AGENT
// Scores content 0–100 across 6 dimensions
// Rule: >= 80 auto-publish, 50-79 needs approval, < 50 reject
// ============================================================

import type { QualityOutput, WriterOutput, OptimizerOutput } from '../types';

const SYSTEM_PROMPT = `You are the Quality Agent. Score content from 0-100. Return JSON:
{
  "total_score": number,
  "breakdown": {
    "clarity": number,
    "accuracy": number,
    "originality": number,
    "intent_match": number,
    "aeo_compliance": number,
    "seo_compliance": number
  },
  "verdict": "auto_publish|needs_approval|reject",
  "reasoning": "string",
  "suggestions": ["string"],
  "publish_ready": boolean
}
Be strict. Score < 80 = needs human approval. Score >= 80 = auto-publish eligible.
Respond ONLY with valid JSON.`;

export async function runQuality(
  content: WriterOutput,
  optimization: OptimizerOutput
): Promise<QualityOutput> {
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
        content: `Score this content:\nTitle: ${content.title}\nMeta: ${content.meta_description}\nDirect Answer: ${content.direct_answer}\nOutline items: ${content.outline?.length || 0}\nFAQs: ${content.faq?.length || 0}\nOptimization score: ${optimization.optimization_score}`,
      }],
    }),
  });

  const data = await response.json();
  const text = data.content?.map((b: any) => b.text || '').join('') || '';
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}
