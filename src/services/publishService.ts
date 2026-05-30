// ============================================================
// PUBLISH SERVICE
// Handles auto-publish logic and approval routing
// ============================================================

import type { PipelineResult, ContentStatus } from '../types';

const AUTO_PUBLISH_THRESHOLD = 80;
const REJECTION_THRESHOLD = 50;

export function determinePublishAction(result: PipelineResult): ContentStatus {
  const score = result.quality.total_score;

  if (score >= AUTO_PUBLISH_THRESHOLD) return 'auto_published';
  if (score >= REJECTION_THRESHOLD) return 'pending_approval';
  return 'rejected';
}

export function validateContentRequirements(result: PipelineResult): {
  valid: boolean;
  missing: string[];
} {
  const missing: string[] = [];
  const { content, optimization } = result;

  if (!content.direct_answer) missing.push('AEO direct answer');
  if (!content.faq?.length) missing.push('FAQ section');
  if (!content.title) missing.push('SEO title');
  if (!content.meta_description) missing.push('Meta description');
  if (!optimization.aeo_signals?.has_structured_headings) missing.push('Structured headings');

  return { valid: missing.length === 0, missing };
}

export function generatePublishMetadata(result: PipelineResult) {
  return {
    slug: result.content.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 60),
    published_at: new Date().toISOString(),
    schema_markup: buildSchemaMarkup(result),
  };
}

function buildSchemaMarkup(result: PipelineResult) {
  const { content } = result;
  const base = {
    '@context': 'https://schema.org',
    '@type': content.schema_type || 'Article',
    name: content.title,
    description: content.meta_description,
  };

  if (content.faq?.length) {
    return {
      ...base,
      mainEntity: content.faq.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    };
  }

  return base;
}
