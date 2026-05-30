// ============================================================
// ALL 5 AI AGENTS — powered by Google Gemini (free tier)
// ============================================================
import { callGeminiJSON } from './gemini'
import type {
  KeywordData, ContentDraft, OptimizationResult, QualityResult, PipelineResult, ContentStatus
} from './types'

// ---- 1. ORCHESTRATOR ----
export async function runOrchestrator(keyword: string, context?: string) {
  return callGeminiJSON<{
    task: string; routing: string[]; auto_publish_threshold: number;
    priority: 'high'|'medium'|'low'; reasoning: string; estimated_seconds: number
  }>(
    `You are the Orchestrator Agent in a Growth OS for local businesses.
Return ONLY valid JSON:
{
  "task": "brief task description",
  "routing": ["research","writer","optimizer","quality"],
  "auto_publish_threshold": 80,
  "priority": "high|medium|low",
  "reasoning": "why this keyword matters",
  "estimated_seconds": 45
}`,
    `Keyword: "${keyword}"\nContext: ${context || 'Local business SEO campaign'}`
  )
}

// ---- 2. RESEARCH ----
export async function runResearch(keyword: string, businessType?: string): Promise<KeywordData> {
  return callGeminiJSON<KeywordData>(
    `You are a local SEO Research Agent. Analyze keywords for local businesses.
Return ONLY valid JSON matching this exact structure:
{
  "keyword": "string",
  "search_volume": "string like '1,200/mo'",
  "difficulty": 35,
  "intent": "informational|commercial|transactional|navigational",
  "related": ["keyword1","keyword2","keyword3","keyword4","keyword5"],
  "clusters": ["cluster1","cluster2","cluster3"],
  "target_audience": "string",
  "content_angle": "string - what unique angle to take",
  "local_relevance": 85
}`,
    `Keyword: "${keyword}"\nBusiness type: ${businessType || 'local business'}`
  )
}

// ---- 3. WRITER ----
export async function runWriter(keyword: string, research: KeywordData, businessName?: string): Promise<ContentDraft> {
  return callGeminiJSON<ContentDraft>(
    `You are an expert local SEO + AEO content writer. Write content that ranks locally AND gets featured in AI answer engines (Google SGE, Perplexity, ChatGPT).
Return ONLY valid JSON:
{
  "title": "SEO title max 60 chars",
  "meta_description": "meta desc max 155 chars",
  "direct_answer": "2-3 sentence direct answer for featured snippets - be specific and factual",
  "outline": [
    {"heading": "H2 heading", "type": "h2", "content": "2-3 sentence summary of this section"},
    {"heading": "H3 sub-heading", "type": "h3", "content": "2-3 sentences"}
  ],
  "faq": [
    {"question": "specific question", "answer": "concise 2-3 sentence answer"}
  ],
  "word_count": 1200,
  "reading_level": "Grade 8",
  "schema_type": "LocalBusiness|Article|HowTo|FAQ|Service",
  "local_keywords": ["local keyword 1","local keyword 2","local keyword 3"],
  "call_to_action": "Book a free session today — call us or visit our website"
}
Include at least 5 outline sections and 5 FAQ items. Be genuinely useful.`,
    `Keyword: "${keyword}"\nBusiness: ${businessName || 'local business'}\nResearch: ${JSON.stringify(research)}`
  )
}

// ---- 4. OPTIMIZER ----
export async function runOptimizer(keyword: string, content: ContentDraft): Promise<OptimizationResult> {
  return callGeminiJSON<OptimizationResult>(
    `You are the SEO/AEO Optimizer Agent for local business content.
Return ONLY valid JSON:
{
  "optimized_title": "improved title",
  "optimized_meta": "improved meta description",
  "h1_tag": "H1 tag text",
  "keyword_density": 1.8,
  "readability_score": 72,
  "aeo_signals": {
    "has_direct_answer": true,
    "has_faq_schema": true,
    "has_structured_headings": true,
    "answer_engine_ready": true,
    "featured_snippet_potential": "high|medium|low",
    "local_pack_potential": "high|medium|low"
  },
  "seo_signals": {
    "title_optimized": true,
    "meta_optimized": true,
    "local_seo_optimized": true,
    "schema_ready": true,
    "internal_link_opportunities": ["link opportunity 1"],
    "semantic_keywords": ["related term 1","related term 2"]
  },
  "improvements": ["specific improvement 1","specific improvement 2"],
  "optimization_score": 82
}`,
    `Keyword: "${keyword}"\nTitle: "${content.title}"\nMeta: "${content.meta_description}"\nOutline items: ${content.outline?.length}\nFAQs: ${content.faq?.length}\nLocal keywords: ${JSON.stringify(content.local_keywords)}`
  )
}

// ---- 5. QUALITY ----
export async function runQuality(content: ContentDraft, optimization: OptimizationResult): Promise<QualityResult> {
  return callGeminiJSON<QualityResult>(
    `You are the Quality Agent. Score content strictly 0-100. Be tough — only great content scores 80+.
Rule: score >= 80 = auto-publish. 50-79 = human approval. < 50 = reject.
Return ONLY valid JSON:
{
  "total_score": 84,
  "breakdown": {
    "clarity": 85,
    "accuracy": 88,
    "originality": 80,
    "intent_match": 90,
    "aeo_compliance": 85,
    "seo_compliance": 82,
    "local_relevance": 78
  },
  "verdict": "auto_publish|needs_approval|reject",
  "reasoning": "specific reasoning for the score",
  "suggestions": ["specific improvement 1","specific improvement 2"],
  "publish_ready": true
}`,
    `Title: "${content.title}"\nMeta: "${content.meta_description}"\nDirect answer present: ${!!content.direct_answer}\nOutline sections: ${content.outline?.length || 0}\nFAQ count: ${content.faq?.length || 0}\nLocal keywords: ${content.local_keywords?.length || 0}\nOptimization score: ${optimization.optimization_score}\nAEO ready: ${optimization.aeo_signals?.answer_engine_ready}\nLocal pack potential: ${optimization.aeo_signals?.local_pack_potential}`
  )
}

// ---- FULL PIPELINE ----
export type StepCallback = (step: { agent: string; status: 'running'|'done'|'error'; message: string; data?: unknown }) => void

export async function runFullPipeline(
  keyword: string,
  opts: { businessName?: string; businessType?: string; campaignId?: string },
  onStep?: StepCallback
): Promise<PipelineResult> {
  const emit = (agent: string, status: 'running'|'done'|'error', message: string, data?: unknown) =>
    onStep?.({ agent, status, message, data })

  emit('orchestrator', 'running', 'Analyzing task...')
  const orchestration = await runOrchestrator(keyword, opts.businessType)
  emit('orchestrator', 'done', orchestration.reasoning, orchestration)

  emit('research', 'running', 'Researching keyword intent...')
  const research = await runResearch(keyword, opts.businessType)
  emit('research', 'done', `Intent: ${research.intent} | Difficulty: ${research.difficulty}`, research)

  emit('writer', 'running', 'Writing SEO + AEO content...')
  const content = await runWriter(keyword, research, opts.businessName)
  emit('writer', 'done', `"${content.title}"`, content)

  emit('optimizer', 'running', 'Optimizing for local SEO + AEO...')
  const optimization = await runOptimizer(keyword, content)
  emit('optimizer', 'done', `Score: ${optimization.optimization_score}`, optimization)

  emit('quality', 'running', 'Scoring quality...')
  const quality = await runQuality(content, optimization)
  emit('quality', 'done', `Score: ${quality.total_score} — ${quality.verdict}`, quality)

  const threshold = orchestration.auto_publish_threshold ?? 80
  let final_status: ContentStatus
  if (quality.total_score >= threshold) final_status = 'auto_published'
  else if (quality.total_score >= 50) final_status = 'pending_approval'
  else final_status = 'rejected'

  return {
    keyword, research, content, optimization, quality,
    final_status, generated_at: new Date().toISOString(),
    campaign_id: opts.campaignId,
  }
}
