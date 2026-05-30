
// ============================================================
// GROWTH OS — COMPLETE TYPE DEFINITIONS
// ============================================================

// ---- AI Agents ----
export type AgentStatus = 'idle' | 'running' | 'done' | 'error'

export interface AgentStep {
  agent: string
  status: AgentStatus
  message: string
  data?: unknown
  duration_ms?: number
}

// ---- Campaign / Growth Plan ----
export interface GrowthCampaign {
  id: string
  business_name: string
  business_type: string       // e.g. "padel hall", "restaurant", "dentist"
  location: string            // e.g. "Stockholm, Kista"
  goal: string                // e.g. "100% visibility in 50 days"
  target_days: number
  status: 'active' | 'paused' | 'completed'
  created_at: string
  progress_pct: number
  tasks_total: number
  tasks_done: number
}

// ---- Research ----
export interface KeywordData {
  id?: string
  keyword: string
  search_volume: string
  difficulty: number          // 0–100
  intent: 'informational' | 'commercial' | 'transactional' | 'navigational'
  related: string[]
  clusters: string[]
  target_audience: string
  content_angle: string
  local_relevance: number     // 0–100, important for local businesses
}

// ---- Content ----
export interface ContentOutlineItem {
  heading: string
  type: 'h2' | 'h3'
  content: string
}

export interface FAQItem {
  question: string
  answer: string
}

export interface ContentDraft {
  title: string
  meta_description: string
  direct_answer: string       // AEO: 2-3 sentence featured snippet answer
  outline: ContentOutlineItem[]
  faq: FAQItem[]
  word_count: number
  reading_level: string
  schema_type: 'Article' | 'LocalBusiness' | 'HowTo' | 'FAQ' | 'Service'
  local_keywords: string[]    // for local SEO
  call_to_action: string
}

// ---- Optimization ----
export interface AEOSignals {
  has_direct_answer: boolean
  has_faq_schema: boolean
  has_structured_headings: boolean
  answer_engine_ready: boolean
  featured_snippet_potential: 'high' | 'medium' | 'low'
  local_pack_potential: 'high' | 'medium' | 'low'
}

export interface SEOSignals {
  title_optimized: boolean
  meta_optimized: boolean
  local_seo_optimized: boolean
  schema_ready: boolean
  internal_link_opportunities: string[]
  semantic_keywords: string[]
}

export interface OptimizationResult {
  optimized_title: string
  optimized_meta: string
  h1_tag: string
  keyword_density: number
  readability_score: number
  aeo_signals: AEOSignals
  seo_signals: SEOSignals
  improvements: string[]
  optimization_score: number
}

// ---- Quality ----
export interface QualityBreakdown {
  clarity: number
  accuracy: number
  originality: number
  intent_match: number
  aeo_compliance: number
  seo_compliance: number
  local_relevance: number
}

export interface QualityResult {
  total_score: number
  breakdown: QualityBreakdown
  verdict: 'auto_publish' | 'needs_approval' | 'reject'
  reasoning: string
  suggestions: string[]
  publish_ready: boolean
}

// ---- Full Pipeline Result ----
export type ContentStatus = 'draft' | 'pending_approval' | 'auto_published' | 'published' | 'rejected'

export interface PipelineResult {
  id?: string
  keyword: string
  campaign_id?: string
  research: KeywordData
  content: ContentDraft
  optimization: OptimizationResult
  quality: QualityResult
  final_status: ContentStatus
  generated_at: string
}

// ---- CRM ----
export type PipelineStage = 'Lead' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost'

export interface Lead {
  id: string
  full_name: string
  email?: string
  phone?: string
  company?: string
  stage: PipelineStage
  deal_value: number
  score: number               // 0–100
  source: string              // 'organic' | 'referral' | 'content' | 'paid'
  content_source?: string     // which article generated this lead
  notes?: string
  created_at: string
  updated_at: string
}

export interface Company {
  id: string
  name: string
  domain?: string
  industry: string
  size: string
  total_value: number
  lead_count: number
}

// ---- Content Item (stored) ----
export interface ContentItem {
  id: string
  keyword: string
  title: string
  meta_description: string
  direct_answer: string
  outline: ContentOutlineItem[]
  faq: FAQItem[]
  quality_score: number
  status: ContentStatus
  views: number
  lead_conversions: number
  published_at?: string
  created_at: string
}

// ---- Approval ----
export interface ApprovalItem {
  id: string
  content_id: string
  content?: ContentItem
  pipeline_result?: PipelineResult
  quality_score: number
  action: 'pending' | 'approved' | 'rejected'
  reason?: string
  created_at: string
  reviewed_at?: string
}

// ---- Analytics ----
export interface AnalyticsSummary {
  total_views: number
  total_leads: number
  published_content: number
  avg_quality_score: number
  top_performing: ContentItem[]
  recent_leads: Lead[]
  visibility_score: number    // 0–100, overall SEO presence
}

// ---- 50-Day Growth Plan ----
export interface GrowthTask {
  id: string
  day: number
  week: number
  title: string
  type: 'content' | 'technical_seo' | 'local_seo' | 'backlink' | 'gmb' | 'social'
  priority: 'critical' | 'high' | 'medium'
  status: 'pending' | 'in_progress' | 'done'
  description: string
  expected_impact: string
  keyword?: string
  estimated_hours: number
}

export interface GrowthPlan {
  business_name: string
  business_type: string
  location: string
  goal: string
  target_days: number
  weeks: {
    week: number
    theme: string
    focus: string
    tasks: GrowthTask[]
  }[]
  kpis: {
    metric: string
    baseline: string
    target: string
    day: number
  }[]
  quick_wins: string[]
}
