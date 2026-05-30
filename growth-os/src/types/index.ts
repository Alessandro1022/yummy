// ============================================================
// GROWTH OS — TYPE DEFINITIONS
// ============================================================

export type AgentType = 'orchestrator' | 'research' | 'writer' | 'optimizer' | 'quality';
export type AgentStatus = 'pending' | 'running' | 'done' | 'error';
export type ContentStatus = 'draft' | 'pending_approval' | 'auto_published' | 'published' | 'rejected';
export type PipelineStage = 'Lead' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost';
export type SearchIntent = 'informational' | 'commercial' | 'transactional' | 'navigational';
export type SchemaType = 'Article' | 'HowTo' | 'FAQ' | 'BreadcrumbList';

// ---- Agent Outputs ----

export interface OrchestratorOutput {
  task: string;
  routing: AgentType[];
  auto_publish_threshold: number;
  estimated_time_seconds: number;
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
}

export interface ResearchOutput {
  keyword: string;
  search_volume: string;
  difficulty: number;
  intent: SearchIntent;
  related_keywords: string[];
  topic_clusters: string[];
  target_audience: string;
  content_angle: string;
  competitor_gaps: string[];
}

export interface ContentOutlineItem {
  heading: string;
  type: 'h2' | 'h3';
  content: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface WriterOutput {
  title: string;
  meta_description: string;
  direct_answer: string;
  outline: ContentOutlineItem[];
  faq: FAQItem[];
  word_count: number;
  reading_level: string;
  schema_type: SchemaType;
}

export interface AEOSignals {
  has_direct_answer: boolean;
  has_faq_schema: boolean;
  has_structured_headings: boolean;
  answer_engine_ready: boolean;
  featured_snippet_potential: 'high' | 'medium' | 'low';
}

export interface SEOSignals {
  title_optimized: boolean;
  meta_optimized: boolean;
  internal_link_opportunities: string[];
  semantic_keywords: string[];
}

export interface OptimizerOutput {
  optimized_title: string;
  optimized_meta: string;
  h1_tag: string;
  keyword_density: number;
  readability_score: number;
  aeo_signals: AEOSignals;
  seo_signals: SEOSignals;
  improvements: string[];
  optimization_score: number;
}

export interface QualityBreakdown {
  clarity: number;
  accuracy: number;
  originality: number;
  intent_match: number;
  aeo_compliance: number;
  seo_compliance: number;
}

export interface QualityOutput {
  total_score: number;
  breakdown: QualityBreakdown;
  verdict: 'auto_publish' | 'needs_approval' | 'reject';
  reasoning: string;
  suggestions: string[];
  publish_ready: boolean;
}

// ---- Pipeline Result ----

export interface PipelineResult {
  keyword: string;
  orchestration: OrchestratorOutput;
  research: ResearchOutput;
  content: WriterOutput;
  optimization: OptimizerOutput;
  quality: QualityOutput;
  final_status: ContentStatus;
  generated_at: string;
}

// ---- CRM ----

export interface Lead {
  id: number;
  name: string;
  company: string;
  email: string;
  stage: PipelineStage;
  value: number;
  score: number;
  created_at?: string;
  content_source?: string;
}

export interface Company {
  id: number;
  name: string;
  domain: string;
  industry: string;
  size: string;
  leads_count: number;
  total_value: number;
}

// ---- Content ----

export interface ContentItem {
  id: number | string;
  title: string;
  score: number;
  status: ContentStatus;
  keyword: string;
  views: number;
  leads: number;
  meta_description?: string;
  created_at?: string;
}

// ---- Approval ----

export interface ApprovalItem {
  id: string;
  result: PipelineResult;
  created_at: string;
  reviewed_by?: string;
  action?: 'approved' | 'rejected';
  reason?: string;
}

// ---- Analytics ----

export interface AnalyticsEvent {
  content_id: string;
  event: 'view' | 'lead_conversion' | 'share';
  metadata?: Record<string, unknown>;
  timestamp: string;
}
