import { useState, useEffect, useCallback, useRef } from "react";

// ============================================================
// TYPES & CONSTANTS
// ============================================================

const AGENT_CONFIGS = {
  orchestrator: {
    name: "Orchestrator",
    icon: "⬡",
    color: "#c084fc",
    role: "Routes jobs, decides auto vs approval, coordinates pipeline",
  },
  research: {
    name: "Research Agent",
    icon: "◈",
    color: "#38bdf8",
    role: "Keyword analysis, topic clustering, user intent mapping",
  },
  writer: {
    name: "Content Writer",
    icon: "◇",
    color: "#34d399",
    role: "SEO + AEO optimized content with FAQ sections",
  },
  optimizer: {
    name: "SEO/AEO Optimizer",
    icon: "◆",
    color: "#fb923c",
    role: "Headings, schema readiness, answer-engine compatibility",
  },
  quality: {
    name: "Quality Agent",
    icon: "◉",
    color: "#f472b6",
    role: "Scores 0–100: clarity, accuracy, duplication, intent match",
  },
};

const PIPELINE_STAGES = ["Lead", "Qualified", "Proposal", "Negotiation", "Won", "Lost"];

const SAMPLE_LEADS = [
  { id: 1, name: "Aria Matsuda", company: "NovaTech SaaS", email: "aria@novatech.io", stage: "Qualified", value: 24000, score: 87 },
  { id: 2, name: "Marcus Oyelaran", company: "Apex Fintech", email: "m.oyelaran@apexfi.com", stage: "Proposal", value: 58000, score: 92 },
  { id: 3, name: "Lena Voss", company: "CloudCore GmbH", email: "l.voss@cloudcore.de", stage: "Lead", value: 12000, score: 61 },
  { id: 4, name: "Dante Ruiz", company: "ScaleOps", email: "dante@scaleops.io", stage: "Negotiation", value: 95000, score: 94 },
  { id: 5, name: "Yuki Tanaka", company: "Fusion Analytics", email: "yuki@fusionai.jp", stage: "Won", value: 42000, score: 88 },
];

const SAMPLE_CONTENT = [
  { id: 1, title: "How AI Agents Automate B2B Sales Pipelines in 2025", score: 91, status: "published", keyword: "AI sales automation", views: 4821, leads: 12 },
  { id: 2, title: "AEO vs SEO: The Complete Guide for SaaS Marketers", score: 88, status: "published", keyword: "AEO optimization", views: 3204, leads: 8 },
  { id: 3, title: "Top CRM Integrations for Growth-Stage Startups", score: 76, status: "pending_approval", keyword: "CRM integrations", views: 0, leads: 0 },
  { id: 4, title: "What is Answer Engine Optimization? (Full Breakdown)", score: 93, status: "published", keyword: "what is AEO", views: 7102, leads: 21 },
];

// ============================================================
// API LAYER — Calls Anthropic via the injected proxy
// ============================================================

async function callAgent(agentType, payload) {
  const systemPrompts = {
    orchestrator: `You are the Orchestrator Agent in a Growth OS system. Given a keyword and context, output a JSON plan:
{
  "task": "string",
  "routing": ["research","writer","optimizer","quality"],
  "auto_publish_threshold": 80,
  "estimated_time_seconds": number,
  "priority": "high|medium|low",
  "reasoning": "string"
}
Respond ONLY with valid JSON.`,

    research: `You are the Research Agent. Given a keyword, output JSON:
{
  "keyword": "string",
  "search_volume": "string",
  "difficulty": number,
  "intent": "informational|commercial|transactional|navigational",
  "related_keywords": ["string"],
  "topic_clusters": ["string"],
  "target_audience": "string",
  "content_angle": "string",
  "competitor_gaps": ["string"]
}
Respond ONLY with valid JSON.`,

    writer: `You are an expert SEO + AEO Content Writer. Given a keyword and research data, produce a full article in JSON:
{
  "title": "string (60 chars max, keyword-first)",
  "meta_description": "string (155 chars max)",
  "direct_answer": "string (2-3 sentences, AEO format — direct, factual, citation-worthy)",
  "outline": [{"heading": "string", "type": "h2|h3", "content": "string (2-3 sentences)"}],
  "faq": [{"question": "string", "answer": "string (concise, 2-4 sentences)"}],
  "word_count": number,
  "reading_level": "string",
  "schema_type": "Article|HowTo|FAQ|BreadcrumbList"
}
Include at least 4 outline sections and 4 FAQs. Make content genuinely valuable, not generic.
Respond ONLY with valid JSON.`,

    optimizer: `You are the SEO/AEO Optimizer Agent. Given article content, return optimization report JSON:
{
  "optimized_title": "string",
  "optimized_meta": "string",
  "h1_tag": "string",
  "keyword_density": number,
  "readability_score": number,
  "aeo_signals": {
    "has_direct_answer": boolean,
    "has_faq_schema": boolean,
    "has_structured_headings": boolean,
    "answer_engine_ready": boolean,
    "featured_snippet_potential": "high|medium|low"
  },
  "seo_signals": {
    "title_optimized": boolean,
    "meta_optimized": boolean,
    "internal_link_opportunities": ["string"],
    "semantic_keywords": ["string"]
  },
  "improvements": ["string"],
  "optimization_score": number
}
Respond ONLY with valid JSON.`,

    quality: `You are the Quality Agent. Score content from 0-100. Return JSON:
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
Respond ONLY with valid JSON.`,
  };

  const userMessages = {
    orchestrator: `Analyze this keyword and create a pipeline plan: "${payload.keyword}"`,
    research: `Research this keyword deeply: "${payload.keyword}"`,
    writer: `Write a full SEO+AEO article for: "${payload.keyword}"\nResearch context: ${JSON.stringify(payload.research || {})}`,
    optimizer: `Optimize this content for SEO and AEO:\nTitle: ${payload.title}\nContent summary: ${JSON.stringify(payload.content || {})}`,
    quality: `Score this content:\nTitle: ${payload.title}\nMeta: ${payload.meta_description}\nDirect Answer: ${payload.direct_answer}\nOutline items: ${payload.outline?.length || 0}\nFAQs: ${payload.faq?.length || 0}\nOptimization score: ${payload.optimization_score || 0}`,
  };

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompts[agentType],
      messages: [{ role: "user", content: userMessages[agentType] }],
    }),
  });

  if (!response.ok) throw new Error(`Agent ${agentType} failed: ${response.status}`);
  const data = await response.json();
  const text = data.content?.map((b) => b.text || "").join("") || "";
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// ============================================================
// PIPELINE RUNNER
// ============================================================

async function runFullPipeline(keyword, onStep) {
  const steps = [];

  onStep({ phase: "orchestrator", status: "running", message: "Analyzing task and routing pipeline..." });
  const orchestration = await callAgent("orchestrator", { keyword });
  steps.push({ phase: "orchestrator", data: orchestration });
  onStep({ phase: "orchestrator", status: "done", data: orchestration });

  onStep({ phase: "research", status: "running", message: "Researching keyword intent and topic clusters..." });
  const research = await callAgent("research", { keyword });
  steps.push({ phase: "research", data: research });
  onStep({ phase: "research", status: "done", data: research });

  onStep({ phase: "writer", status: "running", message: "Writing SEO + AEO optimized content..." });
  const content = await callAgent("writer", { keyword, research });
  steps.push({ phase: "writer", data: content });
  onStep({ phase: "writer", status: "done", data: content });

  onStep({ phase: "optimizer", status: "running", message: "Optimizing headings, schema, AEO signals..." });
  const optimization = await callAgent("optimizer", { keyword, title: content.title, content });
  steps.push({ phase: "optimizer", data: optimization });
  onStep({ phase: "optimizer", status: "done", data: optimization });

  onStep({ phase: "quality", status: "running", message: "Scoring content quality..." });
  const quality = await callAgent("quality", {
    keyword,
    ...content,
    optimization_score: optimization.optimization_score,
  });
  steps.push({ phase: "quality", data: quality });
  onStep({ phase: "quality", status: "done", data: quality });

  return {
    keyword,
    orchestration,
    research,
    content,
    optimization,
    quality,
    final_status:
      quality.total_score >= 80
        ? "auto_published"
        : quality.total_score >= 50
        ? "pending_approval"
        : "rejected",
    generated_at: new Date().toISOString(),
  };
}

// ============================================================
// COMPONENTS
// ============================================================

function GlowDot({ color, pulse }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: color,
        boxShadow: `0 0 6px ${color}`,
        animation: pulse ? "pulseGlow 1.2s ease-in-out infinite" : "none",
      }}
    />
  );
}

function ScoreBadge({ score }) {
  const color = score >= 80 ? "#34d399" : score >= 60 ? "#fb923c" : "#f87171";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 700,
        background: `${color}22`,
        color,
        border: `1px solid ${color}44`,
        letterSpacing: "0.02em",
      }}
    >
      {score}
    </span>
  );
}

function StatusPill({ status }) {
  const map = {
    auto_published: { label: "Auto-Published", color: "#34d399" },
    published: { label: "Published", color: "#34d399" },
    pending_approval: { label: "Needs Approval", color: "#fb923c" },
    running: { label: "Processing", color: "#38bdf8" },
    rejected: { label: "Rejected", color: "#f87171" },
  };
  const s = map[status] || { label: status, color: "#9ca3af" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        background: `${s.color}18`,
        color: s.color,
        border: `1px solid ${s.color}30`,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
      }}
    >
      <GlowDot color={s.color} pulse={status === "running"} />
      {s.label}
    </span>
  );
}

function AgentNode({ agent, status, data }) {
  const cfg = AGENT_CONFIGS[agent];
  const isRunning = status === "running";
  const isDone = status === "done";
  const isPending = status === "pending";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        opacity: isPending ? 0.35 : 1,
        transition: "opacity 0.4s ease",
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          background: isDone
            ? `${cfg.color}22`
            : isRunning
            ? `${cfg.color}14`
            : "rgba(255,255,255,0.04)",
          border: `2px solid ${isDone || isRunning ? cfg.color : "rgba(255,255,255,0.1)"}`,
          boxShadow: isRunning ? `0 0 18px ${cfg.color}55` : isDone ? `0 0 8px ${cfg.color}33` : "none",
          animation: isRunning ? "spinSlow 3s linear infinite" : "none",
          transition: "all 0.5s ease",
          position: "relative",
        }}
      >
        {cfg.icon}
        {isDone && (
          <div
            style={{
              position: "absolute",
              bottom: -2,
              right: -2,
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: "#34d399",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 9,
              color: "#000",
              fontWeight: 700,
            }}
          >
            ✓
          </div>
        )}
      </div>
      <span style={{ fontSize: 10, color: isDone ? cfg.color : "rgba(255,255,255,0.4)", fontWeight: 600, letterSpacing: "0.04em", textAlign: "center", maxWidth: 70 }}>
        {cfg.name.replace(" Agent", "")}
      </span>
    </div>
  );
}

function ContentResultCard({ result, onApprove, onReject }) {
  const [expanded, setExpanded] = useState(false);
  const { content, quality, optimization, research, final_status } = result;
  const q = quality || {};
  const c = content || {};
  const o = optimization || {};
  const r = research || {};

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        overflow: "hidden",
        marginTop: 16,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "18px 20px",
          borderBottom: expanded ? "1px solid rgba(255,255,255,0.06)" : "none",
          display: "flex",
          alignItems: "flex-start",
          gap: 14,
          cursor: "pointer",
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
            <StatusPill status={final_status} />
            {q.total_score != null && <ScoreBadge score={q.total_score} />}
            <span style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>
              {r.intent && `Intent: ${r.intent}`}
            </span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", lineHeight: 1.4, fontFamily: "'DM Serif Display', Georgia, serif" }}>
            {c.title || "Generating..."}
          </div>
          {c.meta_description && (
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4, lineHeight: 1.5 }}>
              {c.meta_description}
            </div>
          )}
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", flexShrink: 0 }}>
          {expanded ? "▲" : "▼"}
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "0 20px 20px" }}>
          {/* AEO Direct Answer */}
          {c.direct_answer && (
            <div
              style={{
                background: "rgba(56,189,248,0.08)",
                border: "1px solid rgba(56,189,248,0.2)",
                borderLeft: "3px solid #38bdf8",
                borderRadius: 8,
                padding: "12px 14px",
                marginBottom: 16,
                marginTop: 16,
              }}
            >
              <div style={{ fontSize: 10, color: "#38bdf8", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 6, textTransform: "uppercase" }}>
                ◈ AEO Direct Answer
              </div>
              <div style={{ fontSize: 13, color: "#e2e8f0", lineHeight: 1.6 }}>{c.direct_answer}</div>
            </div>
          )}

          {/* Two column: outline + quality */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {/* Outline */}
            {c.outline && c.outline.length > 0 && (
              <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 10, padding: 14, border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: 10, color: "#c084fc", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 10, textTransform: "uppercase" }}>
                  ◇ Article Structure
                </div>
                {c.outline.map((h, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 9, color: "#64748b", fontFamily: "monospace", paddingTop: 2, flexShrink: 0 }}>
                      {h.type?.toUpperCase() || "H2"}
                    </span>
                    <span style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.4 }}>{h.heading}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Quality breakdown */}
            {q.breakdown && (
              <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 10, padding: 14, border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: 10, color: "#f472b6", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 10, textTransform: "uppercase" }}>
                  ◉ Quality Breakdown
                </div>
                {Object.entries(q.breakdown).map(([k, v]) => (
                  <div key={k} style={{ marginBottom: 7 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: "#94a3b8", textTransform: "capitalize" }}>{k.replace(/_/g, " ")}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: v >= 80 ? "#34d399" : v >= 60 ? "#fb923c" : "#f87171" }}>{v}</span>
                    </div>
                    <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${v}%`,
                          height: "100%",
                          background: v >= 80 ? "#34d399" : v >= 60 ? "#fb923c" : "#f87171",
                          borderRadius: 99,
                          transition: "width 0.8s ease",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AEO Signals */}
          {o.aeo_signals && (
            <div style={{ marginTop: 14, background: "rgba(255,255,255,0.02)", borderRadius: 10, padding: 14, border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 10, color: "#fb923c", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 10, textTransform: "uppercase" }}>
                ◆ AEO / SEO Signals
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {Object.entries(o.aeo_signals).map(([k, v]) => (
                  <span
                    key={k}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 6,
                      fontSize: 11,
                      background: v === true || v === "high" ? "rgba(52,211,153,0.1)" : v === false ? "rgba(248,113,113,0.1)" : "rgba(251,146,60,0.1)",
                      color: v === true || v === "high" ? "#34d399" : v === false ? "#f87171" : "#fb923c",
                      border: `1px solid ${v === true || v === "high" ? "#34d39930" : v === false ? "#f8717130" : "#fb923c30"}`,
                    }}
                  >
                    {k.replace(/_/g, " ")}: {typeof v === "boolean" ? (v ? "✓" : "✗") : v}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* FAQ */}
          {c.faq && c.faq.length > 0 && (
            <div style={{ marginTop: 14, background: "rgba(255,255,255,0.02)", borderRadius: 10, padding: 14, border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 10, color: "#38bdf8", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 10, textTransform: "uppercase" }}>
                ◈ FAQ Section ({c.faq.length} questions)
              </div>
              {c.faq.map((f, i) => (
                <div key={i} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: i < c.faq.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", marginBottom: 4 }}>Q: {f.question}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>A: {f.answer}</div>
                </div>
              ))}
            </div>
          )}

          {/* Quality reasoning */}
          {q.reasoning && (
            <div
              style={{
                marginTop: 14,
                padding: "10px 14px",
                background: "rgba(255,255,255,0.02)",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Quality Assessment
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>{q.reasoning}</div>
            </div>
          )}

          {/* Approval Actions */}
          {final_status === "pending_approval" && (
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button
                onClick={() => onApprove(result)}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 8,
                  border: "1px solid #34d399",
                  background: "rgba(52,211,153,0.1)",
                  color: "#34d399",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  letterSpacing: "0.04em",
                  transition: "all 0.2s",
                }}
              >
                ✓ Approve & Publish
              </button>
              <button
                onClick={() => onReject(result)}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 8,
                  border: "1px solid #f87171",
                  background: "rgba(248,113,113,0.08)",
                  color: "#f87171",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  letterSpacing: "0.04em",
                }}
              >
                ✗ Reject
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================

export default function GrowthOS() {
  const [activeTab, setActiveTab] = useState("generate");
  const [keyword, setKeyword] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [agentStatuses, setAgentStatuses] = useState({});
  const [currentMessage, setCurrentMessage] = useState("");
  const [results, setResults] = useState([]);
  const [leads, setLeads] = useState(SAMPLE_LEADS);
  const [contentItems, setContentItems] = useState(SAMPLE_CONTENT);
  const [error, setError] = useState(null);
  const [approvalQueue, setApprovalQueue] = useState([]);
  const [stats, setStats] = useState({ generated: 0, approved: 0, rejected: 0, total_leads: SAMPLE_LEADS.length });
  const logRef = useRef(null);

  // Inject styles
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=IBM+Plex+Mono:wght@400;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { background: #060810; }
      @keyframes pulseGlow {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(0.8); }
      }
      @keyframes spinSlow {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(16px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      ::-webkit-scrollbar { width: 4px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 99px; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const handleStep = useCallback((step) => {
    setCurrentMessage(step.message || "");
    setAgentStatuses((prev) => ({
      ...prev,
      [step.phase]: step.status,
    }));
  }, []);

  const resetAgents = () => {
    setAgentStatuses(
      Object.keys(AGENT_CONFIGS).reduce((a, k) => ({ ...a, [k]: "pending" }), {})
    );
  };

  const handleRun = async () => {
    if (!keyword.trim() || isRunning) return;
    setIsRunning(true);
    setError(null);
    resetAgents();
    setCurrentMessage("Initializing pipeline...");

    try {
      const result = await runFullPipeline(keyword.trim(), handleStep);
      setResults((prev) => [result, ...prev]);
      setStats((prev) => ({
        ...prev,
        generated: prev.generated + 1,
        approved: result.final_status === "auto_published" ? prev.approved + 1 : prev.approved,
      }));
      if (result.final_status === "pending_approval") {
        setApprovalQueue((prev) => [result, ...prev]);
      }
      setCurrentMessage("Pipeline complete.");
      setKeyword("");
    } catch (e) {
      setError(e.message);
      setCurrentMessage("Pipeline error.");
    } finally {
      setIsRunning(false);
    }
  };

  const handleApprove = (result) => {
    setApprovalQueue((prev) => prev.filter((r) => r !== result));
    setResults((prev) => prev.map((r) => r === result ? { ...r, final_status: "auto_published" } : r));
    setStats((prev) => ({ ...prev, approved: prev.approved + 1 }));
  };

  const handleReject = (result) => {
    setApprovalQueue((prev) => prev.filter((r) => r !== result));
    setResults((prev) => prev.map((r) => r === result ? { ...r, final_status: "rejected" } : r));
    setStats((prev) => ({ ...prev, rejected: prev.rejected + 1 }));
  };

  const TABS = [
    { id: "generate", label: "Generate", icon: "◇" },
    { id: "content", label: "Content", icon: "◈" },
    { id: "crm", label: "CRM", icon: "◆" },
    { id: "approvals", label: `Approvals ${approvalQueue.length > 0 ? `(${approvalQueue.length})` : ""}`, icon: "◉" },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#060810",
        color: "#e2e8f0",
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background grid */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(192,132,252,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(192,132,252,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      {/* Glow orbs */}
      <div style={{ position: "fixed", top: -120, left: "20%", width: 400, height: 400, background: "rgba(192,132,252,0.06)", borderRadius: "50%", filter: "blur(80px)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: -80, right: "10%", width: 300, height: 300, background: "rgba(56,189,248,0.04)", borderRadius: "50%", filter: "blur(60px)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 900, margin: "0 auto", padding: "0 16px 60px" }}>
        {/* Header */}
        <div style={{ padding: "28px 0 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #c084fc, #38bdf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
              ⬡
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: "#f8fafc", fontFamily: "'DM Serif Display', Georgia, serif" }}>
                Growth OS
              </div>
              <div style={{ fontSize: 11, color: "#475569", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                AI Revenue Engine
              </div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 16 }}>
              {[
                { label: "Generated", value: stats.generated, color: "#c084fc" },
                { label: "Published", value: stats.approved, color: "#34d399" },
                { label: "Leads", value: stats.total_leads, color: "#38bdf8" },
              ].map((s) => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginTop: 16 }}>
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  padding: "7px 14px",
                  borderRadius: 8,
                  border: activeTab === t.id ? "1px solid rgba(192,132,252,0.4)" : "1px solid transparent",
                  background: activeTab === t.id ? "rgba(192,132,252,0.1)" : "transparent",
                  color: activeTab === t.id ? "#c084fc" : "#64748b",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  letterSpacing: "0.02em",
                  transition: "all 0.2s",
                }}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ---- GENERATE TAB ---- */}
        {activeTab === "generate" && (
          <div style={{ animation: "fadeInUp 0.4s ease" }}>
            {/* Keyword Input */}
            <div
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 14,
                padding: 20,
                marginBottom: 20,
              }}
            >
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
                ⬡ Keyword → Content Pipeline
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRun()}
                  placeholder="Enter a keyword or topic (e.g. 'AI SEO automation 2025')"
                  disabled={isRunning}
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10,
                    color: "#f1f5f9",
                    fontSize: 14,
                    outline: "none",
                    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                  }}
                />
                <button
                  onClick={handleRun}
                  disabled={isRunning || !keyword.trim()}
                  style={{
                    padding: "12px 22px",
                    borderRadius: 10,
                    border: "none",
                    background: isRunning
                      ? "rgba(192,132,252,0.2)"
                      : "linear-gradient(135deg, #c084fc, #38bdf8)",
                    color: isRunning ? "#c084fc" : "#060810",
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: isRunning || !keyword.trim() ? "not-allowed" : "pointer",
                    letterSpacing: "0.04em",
                    transition: "all 0.3s",
                    whiteSpace: "nowrap",
                  }}
                >
                  {isRunning ? "Running..." : "▶ Run Pipeline"}
                </button>
              </div>
              {error && (
                <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, fontSize: 12, color: "#f87171" }}>
                  ✗ {error}
                </div>
              )}
            </div>

            {/* Agent Pipeline Visualization */}
            <div
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 14,
                padding: 20,
                marginBottom: 20,
              }}
            >
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>
                Multi-Agent Orchestration
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px" }}>
                {Object.keys(AGENT_CONFIGS).map((agent, idx) => (
                  <div key={agent} style={{ display: "flex", alignItems: "center", flex: idx < Object.keys(AGENT_CONFIGS).length - 1 ? "1" : "0" }}>
                    <AgentNode
                      agent={agent}
                      status={agentStatuses[agent] || "pending"}
                      data={null}
                    />
                    {idx < Object.keys(AGENT_CONFIGS).length - 1 && (
                      <div
                        style={{
                          flex: 1,
                          height: 1,
                          margin: "0 6px",
                          background: agentStatuses[Object.keys(AGENT_CONFIGS)[idx + 1]] !== "pending"
                            ? "linear-gradient(90deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05))"
                            : "rgba(255,255,255,0.05)",
                          transition: "background 0.5s",
                          position: "relative",
                          top: -12,
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
              {currentMessage && (
                <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(192,132,252,0.06)", borderRadius: 8, fontSize: 12, color: "#c084fc", display: "flex", alignItems: "center", gap: 8 }}>
                  <GlowDot color="#c084fc" pulse={isRunning} />
                  {currentMessage}
                </div>
              )}
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
                  Generated Results ({results.length})
                </div>
                {results.map((r, i) => (
                  <ContentResultCard key={i} result={r} onApprove={handleApprove} onReject={handleReject} />
                ))}
              </div>
            )}

            {results.length === 0 && !isRunning && (
              <div
                style={{
                  textAlign: "center",
                  padding: "50px 20px",
                  color: "#334155",
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 12 }}>⬡</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#475569", marginBottom: 6 }}>No content generated yet</div>
                <div style={{ fontSize: 12, color: "#334155" }}>Enter a keyword above to run the full AI pipeline</div>
              </div>
            )}
          </div>
        )}

        {/* ---- CONTENT TAB ---- */}
        {activeTab === "content" && (
          <div style={{ animation: "fadeInUp 0.4s ease" }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>
              Content Library
            </div>
            {[...contentItems, ...results.map(r => ({
              id: `gen-${r.generated_at}`,
              title: r.content?.title || "Untitled",
              score: r.quality?.total_score || 0,
              status: r.final_status || "pending",
              keyword: r.keyword,
              views: 0,
              leads: 0,
            }))].map((item, i) => (
              <div
                key={item.id}
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 12,
                  padding: "14px 16px",
                  marginBottom: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  animation: "fadeInUp 0.3s ease",
                  animationDelay: `${i * 0.04}s`,
                  animationFillMode: "both",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                    <StatusPill status={item.status} />
                    <ScoreBadge score={item.score} />
                    <span style={{ fontSize: 11, fontFamily: "monospace", color: "#475569", background: "rgba(255,255,255,0.03)", padding: "2px 6px", borderRadius: 4 }}>
                      {item.keyword}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", lineHeight: 1.4 }}>{item.title}</div>
                </div>
                <div style={{ display: "flex", gap: 20, flexShrink: 0, textAlign: "right" }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#38bdf8" }}>{item.views.toLocaleString()}</div>
                    <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em" }}>Views</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#c084fc" }}>{item.leads}</div>
                    <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em" }}>Leads</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ---- CRM TAB ---- */}
        {activeTab === "crm" && (
          <div style={{ animation: "fadeInUp 0.4s ease" }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>
              Pipeline — {leads.length} Leads
            </div>

            {/* Pipeline kanban header */}
            <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
              {PIPELINE_STAGES.map((stage) => {
                const count = leads.filter((l) => l.stage === stage).length;
                const value = leads.filter((l) => l.stage === stage).reduce((a, l) => a + l.value, 0);
                return (
                  <div
                    key={stage}
                    style={{
                      flex: "0 0 auto",
                      padding: "10px 14px",
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 10,
                      minWidth: 110,
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{stage}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#f1f5f9" }}>{count}</div>
                    <div style={{ fontSize: 10, color: "#475569" }}>${(value / 1000).toFixed(0)}k</div>
                  </div>
                );
              })}
            </div>

            {/* Lead cards */}
            {leads.map((lead, i) => (
              <div
                key={lead.id}
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 12,
                  padding: "14px 16px",
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  animation: "fadeInUp 0.3s ease",
                  animationDelay: `${i * 0.05}s`,
                  animationFillMode: "both",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: `linear-gradient(135deg, ${["#c084fc","#38bdf8","#34d399","#fb923c","#f472b6"][i % 5]}22, ${["#c084fc","#38bdf8","#34d399","#fb923c","#f472b6"][i % 5]}0a)`,
                    border: `1px solid ${["#c084fc","#38bdf8","#34d399","#fb923c","#f472b6"][i % 5]}33`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    color: ["#c084fc","#38bdf8","#34d399","#fb923c","#f472b6"][i % 5],
                    flexShrink: 0,
                  }}
                >
                  {lead.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>{lead.name}</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{lead.company} · {lead.email}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    style={{
                      padding: "3px 10px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      background: "rgba(255,255,255,0.04)",
                      color: "#94a3b8",
                      border: "1px solid rgba(255,255,255,0.06)",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {lead.stage}
                  </span>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#34d399" }}>${(lead.value / 1000).toFixed(0)}k</div>
                    <div style={{ fontSize: 10, color: "#475569" }}>Score: {lead.score}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ---- APPROVALS TAB ---- */}
        {activeTab === "approvals" && (
          <div style={{ animation: "fadeInUp 0.4s ease" }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>
              Human Approval Queue — {approvalQueue.length} pending
            </div>
            {approvalQueue.length === 0 ? (
              <div style={{ textAlign: "center", padding: "50px 20px", color: "#334155" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>◉</div>
                <div style={{ fontSize: 13, color: "#475569" }}>No content awaiting approval</div>
                <div style={{ fontSize: 12, color: "#334155", marginTop: 4 }}>
                  Content scoring ≥ 80 auto-publishes. Below 80 lands here.
                </div>
              </div>
            ) : (
              approvalQueue.map((result, i) => (
                <ContentResultCard key={i} result={result} onApprove={handleApprove} onReject={handleReject} />
              ))
            )}

            {/* Rules card */}
            <div
              style={{
                marginTop: 24,
                padding: 16,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 12,
              }}
            >
              <div style={{ fontSize: 10, color: "#475569", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
                Publishing Rules
              </div>
              {[
                { icon: "◈", color: "#34d399", rule: "Quality score ≥ 80 → Auto-published immediately" },
                { icon: "◉", color: "#fb923c", rule: "Quality score 50–79 → Routed to this approval queue" },
                { icon: "◆", color: "#f87171", rule: "Quality score < 50 → Rejected automatically" },
                { icon: "◇", color: "#38bdf8", rule: "Every piece must include: direct answer, headings, FAQ, meta" },
              ].map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
                  <span style={{ color: r.color, fontSize: 12, flexShrink: 0 }}>{r.icon}</span>
                  <span style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{r.rule}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
