// ============================================================
// CRM SERVICE
// Lead scoring, content attribution, pipeline management
// ============================================================

import type { Lead, PipelineStage } from '../types';

export function scoreLeadFromContent(
  lead: Partial<Lead>,
  contentKeyword: string
): number {
  let score = 50; // base score

  // Boost for keyword relevance match
  if (lead.company?.toLowerCase().includes('tech')) score += 10;
  if (lead.stage === 'Qualified') score += 15;
  if (lead.stage === 'Proposal') score += 20;
  if (lead.stage === 'Negotiation') score += 25;
  if (lead.value && lead.value > 50000) score += 15;

  return Math.min(score, 100);
}

export function getStagePipelineValue(leads: Lead[]): Record<PipelineStage, number> {
  const result = {} as Record<PipelineStage, number>;
  for (const lead of leads) {
    result[lead.stage] = (result[lead.stage] || 0) + lead.value;
  }
  return result;
}

export function getContentIdeasFromCRM(leads: Lead[]): string[] {
  const industries = [...new Set(leads.map((l) => l.company))];
  const stages = [...new Set(leads.map((l) => l.stage))];

  const ideas: string[] = [];

  stages.forEach((stage) => {
    if (stage === 'Lead') ideas.push(`How to evaluate [product] for your business`);
    if (stage === 'Qualified') ideas.push(`Top features to look for in [product]`);
    if (stage === 'Proposal') ideas.push(`ROI calculator: is [product] worth it?`);
    if (stage === 'Negotiation') ideas.push(`[Product] pricing guide and comparison`);
  });

  return ideas.slice(0, 5);
}
