// ============================================================
// PIPELINE SERVICE
// Runs all 5 agents in sequence with step callbacks
// ============================================================

import { runOrchestrator } from '../agents/orchestrator';
import { runResearch } from '../agents/research';
import { runWriter } from '../agents/writer';
import { runOptimizer } from '../agents/optimizer';
import { runQuality } from '../agents/quality';
import type { PipelineResult, ContentStatus } from '../types';

export type PipelineStep = {
  phase: string;
  status: 'running' | 'done' | 'error';
  message?: string;
  data?: unknown;
};

export type StepCallback = (step: PipelineStep) => void;

export async function runFullPipeline(
  keyword: string,
  onStep?: StepCallback
): Promise<PipelineResult> {
  const emit = (phase: string, status: PipelineStep['status'], message?: string, data?: unknown) => {
    onStep?.({ phase, status, message, data });
  };

  // 1. Orchestrator
  emit('orchestrator', 'running', 'Analyzing task and routing pipeline...');
  const orchestration = await runOrchestrator(keyword);
  emit('orchestrator', 'done', undefined, orchestration);

  // 2. Research
  emit('research', 'running', 'Researching keyword intent and topic clusters...');
  const research = await runResearch(keyword);
  emit('research', 'done', undefined, research);

  // 3. Writer
  emit('writer', 'running', 'Writing SEO + AEO optimized content...');
  const content = await runWriter(keyword, research);
  emit('writer', 'done', undefined, content);

  // 4. Optimizer
  emit('optimizer', 'running', 'Optimizing headings, schema, AEO signals...');
  const optimization = await runOptimizer(keyword, content);
  emit('optimizer', 'done', undefined, optimization);

  // 5. Quality
  emit('quality', 'running', 'Scoring content quality...');
  const quality = await runQuality(content, optimization);
  emit('quality', 'done', undefined, quality);

  // Determine final status
  const threshold = orchestration.auto_publish_threshold ?? 80;
  let final_status: ContentStatus;

  if (quality.total_score >= threshold) {
    final_status = 'auto_published';
  } else if (quality.total_score >= 50) {
    final_status = 'pending_approval';
  } else {
    final_status = 'rejected';
  }

  return {
    keyword,
    orchestration,
    research,
    content,
    optimization,
    quality,
    final_status,
    generated_at: new Date().toISOString(),
  };
}
