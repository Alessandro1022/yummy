# ⬡ Growth OS — AI Revenue Engine

> CRM + SEO Automation + AEO Content + Multi-Agent Orchestration

---

## 🚀 What is this?

Growth OS is a production-grade AI system where:

**CRM → drives content → drives traffic → drives CRM growth**

It combines:
- **CRM** — lead and pipeline management
- **SEO/AEO Engine** — AI-generated, answer-engine-ready content
- **5 AI Agents** — orchestrator, research, writer, optimizer, quality
- **Human-in-the-loop** — approval queue for content scoring < 80

---

## 🧠 5-Agent Pipeline

```
Keyword
  └→ Orchestrator   — routes job, sets threshold
  └→ Research       — intent, clusters, gaps
  └→ Writer         — SEO+AEO content with FAQ
  └→ Optimizer      — schema, signals, headings
  └→ Quality        — 0–100 score
       ├─ ≥ 80 → Auto-published ✅
       ├─ 50–79 → Approval queue ⏳
       └─ < 50 → Rejected ✗
```

---

## 📁 Project Structure

```
src/
├── agents/
│   ├── orchestrator.ts     ← task routing + priority
│   ├── research.ts         ← keyword intent + topic clusters
│   ├── writer.ts           ← SEO + AEO article generation
│   ├── optimizer.ts        ← schema, AEO signals, headings
│   └── quality.ts          ← 0–100 scoring (6 dimensions)
│
├── services/
│   ├── pipeline.ts         ← runs all 5 agents in sequence
│   ├── publishService.ts   ← auto vs approval routing
│   └── crmService.ts       ← lead scoring + content attribution
│
├── api/
│   ├── pipeline.ts         ← POST /api/pipeline
│   ├── approvals.ts        ← GET/POST /api/approvals
│   └── leads.ts            ← CRUD /api/leads
│
├── db/
│   ├── schema.sql          ← full Postgres schema + RLS
│   └── supabase.ts         ← typed Supabase client
│
├── types/
│   └── index.ts            ← all TypeScript interfaces
│
└── app/
    └── GrowthOS.jsx        ← React MVP (Anthropic API powered)
```

---

## 🗄️ Database Tables

| Table | Purpose |
|---|---|
| `users` | Auth + roles (admin/editor/viewer) |
| `companies` | Company CRM records |
| `leads` | Pipeline leads with stage + score |
| `keywords` | Keyword research data |
| `clusters` | Topic cluster groupings |
| `content` | Full articles with quality scores |
| `approvals` | Human review queue |
| `analytics` | Views, conversions, attribution |

---

## ⚙️ Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env.local
# Fill in ANTHROPIC_API_KEY, Supabase credentials
```

### 3. Set up database
```bash
# Run src/db/schema.sql in Supabase SQL editor
```

### 4. Run development server
```bash
npm run dev
```

---

## 📊 Publishing Rules

- **Quality score ≥ 80** → Auto-published immediately
- **Quality score 50–79** → Routed to human approval queue
- **Quality score < 50** → Auto-rejected

Every content piece MUST include:
- ✓ AEO direct answer (2-3 sentences)
- ✓ Structured headings (H2/H3)
- ✓ FAQ section (≥4 questions)
- ✓ SEO title (≤60 chars)
- ✓ Meta description (≤155 chars)

---

## 🔄 The Growth Loop

```
Content published
  → Drives organic traffic
  → Converts visitors to leads
  → CRM captures + scores leads
  → Lead stage/industry data
  → Generates new content ideas
  → New content published
  → [repeat]
```

---

## 🏗️ Scaling to Multi-Tenant SaaS

- All tables support `tenant_id` column addition
- RLS policies per tenant via Supabase
- Agent calls are stateless — horizontally scalable
- Queue system: add BullMQ/Redis for background jobs
- Rate limiting: per-tenant API quota on pipeline endpoint

---

## 📝 License

MIT
