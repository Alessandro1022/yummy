-- ============================================================
-- GROWTH OS — POSTGRES / SUPABASE SCHEMA
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---- USERS ----
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'editor', 'viewer', 'user')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ
);

-- ---- COMPANIES ----
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  domain TEXT UNIQUE,
  industry TEXT,
  size TEXT CHECK (size IN ('1-10', '11-50', '51-200', '201-1000', '1000+')),
  total_value NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---- LEADS ----
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  email TEXT,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  stage TEXT NOT NULL DEFAULT 'Lead'
    CHECK (stage IN ('Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost')),
  deal_value NUMERIC DEFAULT 0,
  score INTEGER DEFAULT 50 CHECK (score BETWEEN 0 AND 100),
  source TEXT DEFAULT 'organic',
  content_source TEXT,          -- which content piece generated this lead
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---- KEYWORDS ----
CREATE TABLE keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword TEXT UNIQUE NOT NULL,
  search_volume TEXT,
  difficulty INTEGER CHECK (difficulty BETWEEN 0 AND 100),
  intent TEXT CHECK (intent IN ('informational', 'commercial', 'transactional', 'navigational')),
  target_audience TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---- CLUSTERS ----
CREATE TABLE clusters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  keyword_ids UUID[],
  pillar_content_id UUID,        -- references content once created
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---- CONTENT ----
CREATE TABLE content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword_id UUID REFERENCES keywords(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  meta_description TEXT,
  direct_answer TEXT,
  outline JSONB DEFAULT '[]',
  faq JSONB DEFAULT '[]',
  schema_type TEXT DEFAULT 'Article',
  word_count INTEGER,
  reading_level TEXT,

  -- Pipeline data
  research_data JSONB,
  optimization_data JSONB,
  quality_score INTEGER DEFAULT 0 CHECK (quality_score BETWEEN 0 AND 100),
  quality_breakdown JSONB,
  quality_reasoning TEXT,

  -- Status
  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_approval', 'auto_published', 'published', 'rejected')),
  published_at TIMESTAMPTZ,
  slug TEXT UNIQUE,
  schema_markup JSONB,

  -- Attribution
  views INTEGER DEFAULT 0,
  lead_conversions INTEGER DEFAULT 0,
  revenue_attributed NUMERIC DEFAULT 0,

  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---- APPROVALS ----
CREATE TABLE approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID REFERENCES content(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT CHECK (action IN ('approved', 'rejected', 'pending')),
  reason TEXT,
  quality_score_at_review INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- ---- ANALYTICS ----
CREATE TABLE analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID REFERENCES content(id) ON DELETE CASCADE,
  event TEXT NOT NULL CHECK (event IN ('view', 'lead_conversion', 'share', 'click')),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  session_id TEXT,
  referrer TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_leads_stage ON leads(stage);
CREATE INDEX idx_leads_company ON leads(company_id);
CREATE INDEX idx_content_status ON content(status);
CREATE INDEX idx_content_keyword ON content(keyword_id);
CREATE INDEX idx_approvals_content ON approvals(content_id);
CREATE INDEX idx_analytics_content ON analytics(content_id);
CREATE INDEX idx_analytics_event ON analytics(event);

-- ============================================================
-- RLS POLICIES (Supabase)
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT USING (auth.uid() = id);

-- Admins can do everything on leads
CREATE POLICY "Admins full access leads"
  ON leads FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Editors can read/write content
CREATE POLICY "Editors can manage content"
  ON content FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'editor'))
  );

-- ============================================================
-- TRIGGERS: updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_content_updated_at
  BEFORE UPDATE ON content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
