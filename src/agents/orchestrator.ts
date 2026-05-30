// ============================================================
// ORCHESTRATOR AGENT
// Decides task routing and auto vs human approval
// ============================================================

import type { OrchestratorOutput } from '../types';

const SYSTEM_PROMPT = `You are the Orchestrator Agent in a Growth OS system.
Given a keyword and context, output a JSON plan:
{
  "task": "string",
  "routing": ["research","writer","optimizer","quality"],
  "auto_publish_threshold": 80,
  "estimated_time_seconds": number,
  "priority": "high|medium|low",
  "reasoning": "string"
}
Respond ONLY with valid JSON.`;

export async function runOrchestrator(keyword: string): Promise<OrchestratorOutput> {
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
      messages: [{ role: 'user', content: `Analyze this keyword and create a pipeline plan: "${keyword}"` }],
    }),
  });

  const data = await response.json();
  const text = data.content?.map((b: any) => b.text || '').join('') || '';
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}
