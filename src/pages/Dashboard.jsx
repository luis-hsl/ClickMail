import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Send, MousePointerClick, AlertTriangle, Flame,
  ArrowUpRight, ArrowDownRight, ChevronRight,
  Clock, CheckCircle2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { C } from "@/theme/colors";
import { SkeletonCard, SkeletonChart } from "@/components/ui/Skeleton";

// ── Subcomponents ──
const StatusDot = ({ status }) => {
  const map = {
    sending: { color: C.accent, label: "Enviando", pulse: true },
    warming_up: { color: C.warning, label: "Aquecendo", pulse: true },
    completed: { color: C.textDim, label: "Concluído", pulse: false },
    scheduled: { color: C.info, label: "Agendado", pulse: false },
    draft: { color: C.textDim, label: "Rascunho", pulse: false },
    paused: { color: C.warning, label: "Pausado", pulse: false },
    failed: { color: C.danger, label: "Falhou", pulse: false },
  };
  const s = map[status] || map.draft;
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{
        width: 8, height: 8, borderRadius: "50%", background: s.color,
        boxShadow: s.pulse ? `0 0 8px ${s.color}` : "none",
        animation: s.pulse ? "pulse 2s infinite" : "none",
      }} />
      <span style={{ fontSize: 12, color: s.color, fontWeight: 500 }}>{s.label}</span>
    </span>
  );
};

const MetricCard = ({ icon: Icon, label, value, change, changeType, accentColor, accentBg }) => (
  <div style={{
    background: C.card, borderRadius: 16, padding: "20px 24px",
    border: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 12,
    transition: "all 0.2s", cursor: "default",
  }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderLight; e.currentTarget.style.background = C.cardHover; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.card; }}
  >
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12, background: accentBg || C.accentBg,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={20} color={accentColor || C.accent} />
      </div>
      {change !== undefined && change !== null && (
        <span style={{
          display: "flex", alignItems: "center", gap: 2, fontSize: 12, fontWeight: 600,
          color: changeType === "up" ? C.accent : C.danger,
        }}>
          {changeType === "up" ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {change}
        </span>
      )}
    </div>
    <div>
      <p style={{ fontSize: 13, color: C.textDim, marginBottom: 4, fontWeight: 500 }}>{label}</p>
      <p style={{
        fontSize: 28, fontWeight: 700, color: C.text, letterSpacing: "-0.02em", lineHeight: 1,
        fontFamily: "'JetBrains Mono', monospace",
      }}>{value}</p>
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#1c1c1f", border: `1px solid ${C.borderLight}`, borderRadius: 10,
      padding: "10px 14px", boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
    }}>
      <p style={{ fontSize: 11, color: C.textDim, marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ fontSize: 13, color: p.color, fontWeight: 600 }}>
          {p.name}: {p.value.toLocaleString("pt-BR")}
        </p>
      ))}
    </div>
  );
};

// ── Data Fetching ──
async function fetchKPIs() {
  const { data, error } = await supabase
    .from("email_campaigns")
    .select("total_sent, total_delivered, total_opened, total_bounced")
  if (error) throw error;

  const totals = (data || []).reduce((acc, c) => ({
    sent: acc.sent + (c.total_sent || 0),
    delivered: acc.delivered + (c.total_delivered || 0),
    opened: acc.opened + (c.total_opened || 0),
    bounced: acc.bounced + (c.total_bounced || 0),
  }), { sent: 0, delivered: 0, opened: 0, bounced: 0 });

  return {
    sent: totals.sent,
    deliveryRate: totals.sent > 0 ? ((totals.delivered / totals.sent) * 100) : 0,
    openRate: totals.delivered > 0 ? ((totals.opened / totals.delivered) * 100) : 0,
    bounceRate: totals.sent > 0 ? ((totals.bounced / totals.sent) * 100) : 0,
  };
}

async function fetchSendingChart() {
  const since = new Date();
  since.setDate(since.getDate() - 13);
  const sinceStr = since.toISOString();

  const { data, error } = await supabase
    .from("email_sends")
    .select("status, sent_at")
    .gte("sent_at", sinceStr);
  if (error) throw error;

  const days = {};
  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() - 13 + i);
    const key = d.toISOString().split("T")[0];
    days[key] = { day: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), entregues: 0, bounces: 0 };
  }

  (data || []).forEach(s => {
    if (!s.sent_at) return;
    const key = s.sent_at.split("T")[0];
    if (!days[key]) return;
    if (s.status === "bounced") days[key].bounces++;
    else days[key].entregues++;
  });

  return Object.values(days);
}

async function fetchDomain() {
  const { data, error } = await supabase
    .from("email_domains")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data;
}

async function fetchWarmupToday() {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("warmup_schedule")
    .select("*, email_campaigns(name)")
    .eq("scheduled_date", today)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function fetchRecentCampaigns() {
  const { data, error } = await supabase
    .from("email_campaigns")
    .select("id, name, status, total_sent, total_delivered, total_opened, total_bounced, scheduled_at")
    .order("created_at", { ascending: false })
    .limit(3);
  if (error) throw error;
  return data || [];
}

// ── Main Dashboard ──
export default function Dashboard() {
  const [time, setTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ sent: 0, deliveryRate: 0, openRate: 0, bounceRate: 0 });
  const [chartData, setChartData] = useState([]);
  const [domain, setDomain] = useState(null);
  const [warmup, setWarmup] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const loadAll = async () => {
    try {
      const [k, chart, dom, wu, camp] = await Promise.all([
        fetchKPIs(),
        fetchSendingChart(),
        fetchDomain(),
        fetchWarmupToday(),
        fetchRecentCampaigns(),
      ]);
      setKpis(k);
      setChartData(chart);
      setDomain(dom);
      setWarmup(wu);
      setCampaigns(camp);
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  // Realtime: refresh dashboard on send/campaign/warmup changes
  useEffect(() => {
    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "email_sends" }, () => loadAll())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "email_campaigns" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "warmup_schedule" }, () => loadAll())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "email_domains" }, () => loadAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const repScore = domain?.reputation_score || 0;
  const repPct = repScore / 100;
  const circumference = 2 * Math.PI * 58;

  const reputationBreakdown = [
    { name: "SPF", configured: domain?.spf_configured, color: C.accent },
    { name: "DKIM", configured: domain?.dkim_configured, color: C.accentLight },
    { name: "DMARC", configured: domain?.dmarc_configured, color: C.accentDim },
  ];

  if (loading) {
    return (
      <div className="cm-page" style={{ padding: "28px 36px", background: C.bg, minHeight: "100vh" }}>
        <div style={{ marginBottom: 28, height: 50 }} />
        <SkeletonCard count={4} />
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginTop: 24 }}>
          <SkeletonChart height={300} />
          <SkeletonChart height={300} />
        </div>
      </div>
    );
  }

  return (
    <div className="cm-page" style={{
      padding: "28px 36px", background: C.bg, minHeight: "100vh",
      fontFamily: "'DM Sans', sans-serif", color: C.text,
    }}>
      <style>{`
        @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.5 } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>

      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        marginBottom: 28, animation: "fadeIn 0.4s ease-out",
      }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>
            Dashboard
          </h1>
          <p style={{ fontSize: 14, color: C.textDim }}>
            {time.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            {domain && <>{" · "}<span style={{ color: C.accent }}>{domain.domain}</span></>}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{
            padding: "8px 16px", borderRadius: 10, border: `1px solid ${C.border}`,
            background: C.card, color: C.textMuted, fontSize: 13, fontWeight: 500,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
          }}>
            <Clock size={14} /> Últimos 14 dias
          </button>
          <button
            onClick={() => navigate("/campaigns")}
            style={{
              padding: "8px 20px", borderRadius: 10, border: "none",
              background: `linear-gradient(135deg, ${C.accent}, ${C.accentDim})`,
              color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
              boxShadow: "0 4px 16px rgba(16,185,129,0.3)",
            }}>
            <Send size={14} /> Nova Campanha
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="cm-grid-4" style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24,
        animation: "fadeIn 0.5s ease-out 0.1s both",
      }}>
        <MetricCard icon={Send} label="Emails Enviados" value={kpis.sent.toLocaleString("pt-BR")} />
        <MetricCard icon={CheckCircle2} label="Taxa de Entrega" value={`${kpis.deliveryRate.toFixed(1)}%`} />
        <MetricCard icon={MousePointerClick} label="Taxa de Abertura" value={`${kpis.openRate.toFixed(1)}%`} />
        <MetricCard icon={AlertTriangle} label="Taxa de Bounce" value={`${kpis.bounceRate.toFixed(1)}%`}
          accentColor={C.warning} accentBg={C.warningBg}
        />
      </div>

      {/* Charts Row */}
      <div style={{
        display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 24,
        animation: "fadeIn 0.5s ease-out 0.2s both",
      }}>
        {/* Sending Chart */}
        <div style={{
          background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
          padding: "20px 24px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>Volume de Envio</h3>
              <p style={{ fontSize: 12, color: C.textDim, marginTop: 2 }}>Últimos 14 dias</p>
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              {[{ label: "Entregues", color: C.accent }, { label: "Bounces", color: C.danger }].map(l => (
                <span key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.textMuted }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
                  {l.label}
                </span>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.accent} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={C.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="day" stroke={C.textDim} fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke={C.textDim} fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="entregues" stroke={C.accent} strokeWidth={2} fill="url(#gradGreen)" name="Entregues" />
              <Area type="monotone" dataKey="bounces" stroke={C.danger} strokeWidth={1.5} fill="none" name="Bounces" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Reputation Card */}
        <div style={{
          background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
          padding: "20px 24px", display: "flex", flexDirection: "column",
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Reputação do Domínio</h3>
          <p style={{ fontSize: 12, color: C.textDim, marginBottom: 16 }}>{domain?.domain || "Nenhum domínio"}</p>

          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "relative", width: 140, height: 140 }}>
              <svg viewBox="0 0 140 140" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="70" cy="70" r="58" fill="none" stroke={C.border} strokeWidth="8" />
                <circle cx="70" cy="70" r="58" fill="none"
                  stroke={repScore >= 70 ? C.accent : repScore >= 40 ? C.warning : C.danger}
                  strokeWidth="8"
                  strokeDasharray={`${repPct * circumference} ${circumference}`}
                  strokeLinecap="round"
                />
              </svg>
              <div style={{
                position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
              }}>
                <span style={{
                  fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em",
                  color: repScore >= 70 ? C.accent : repScore >= 40 ? C.warning : C.danger,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>{repScore}</span>
                <span style={{ fontSize: 11, color: C.textDim, fontWeight: 500 }}>/ 100</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            {reputationBreakdown.map(item => (
              <div key={item.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <CheckCircle2 size={14} color={item.configured ? item.color : C.textDim} />
                <span style={{ fontSize: 12, color: C.textMuted, flex: 1 }}>{item.name}</span>
                <span style={{
                  fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                  color: item.configured ? item.color : C.danger,
                }}>
                  {item.configured ? "OK" : "Pendente"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16,
        animation: "fadeIn 0.5s ease-out 0.3s both",
      }}>
        {/* Warmup Progress */}
        <div style={{
          background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
          padding: "20px 24px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>Aquecimento Hoje</h3>
              <p style={{ fontSize: 12, color: C.textDim, marginTop: 2 }}>
                {warmup
                  ? `${warmup.actual_sent || 0} de ${warmup.planned_volume} emails enviados`
                  : "Nenhum aquecimento ativo"}
              </p>
            </div>
            {warmup && (
              <span style={{
                background: C.accentBg, color: C.accent,
                fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 8,
              }}>
                <Flame size={12} style={{ display: "inline", verticalAlign: -2, marginRight: 4 }} />
                Dia {warmup.day_number}
              </span>
            )}
          </div>
          {warmup ? (
            <div>
              <div style={{
                background: "rgba(16,185,129,0.1)", borderRadius: 6, height: 8, overflow: "hidden",
              }}>
                <div style={{
                  width: `${warmup.planned_volume > 0 ? Math.min(100, ((warmup.actual_sent || 0) / warmup.planned_volume) * 100) : 0}%`,
                  height: "100%", background: C.accent, borderRadius: 6, transition: "width 0.6s",
                }} />
              </div>
              <div style={{ display: "flex", gap: 20, marginTop: 14 }}>
                {[
                  { label: "Entregues", val: warmup.delivered || 0 },
                  { label: "Bounces", val: warmup.bounced || 0 },
                  { label: "Aberturas", val: warmup.opened || 0 },
                ].map(m => (
                  <span key={m.label} style={{ fontSize: 12, color: C.textDim }}>
                    {m.label}: <span style={{
                      fontWeight: 600, color: C.textMuted, fontFamily: "'JetBrains Mono', monospace",
                    }}>{m.val}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div style={{
              padding: "32px 0", textAlign: "center", color: C.textDim, fontSize: 13,
            }}>
              Nenhum aquecimento agendado para hoje
            </div>
          )}
        </div>

        {/* Recent Campaigns */}
        <div style={{
          background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
          padding: "20px 24px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Campanhas Recentes</h3>
            <span
              onClick={() => navigate("/campaigns")}
              style={{ fontSize: 12, color: C.accent, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 2 }}
            >
              Ver todas <ChevronRight size={14} />
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {campaigns.length === 0 ? (
              <div style={{ padding: "32px 0", textAlign: "center", color: C.textDim, fontSize: 13 }}>
                Nenhuma campanha criada ainda
              </div>
            ) : campaigns.map((c) => (
              <div key={c.id} style={{
                padding: "12px 14px", borderRadius: 12, border: `1px solid ${C.border}`,
                background: "rgba(255,255,255,0.01)", cursor: "pointer", transition: "all 0.15s",
              }}
                onClick={() => navigate(`/campaigns/${c.id}`)}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderLight; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = "rgba(255,255,255,0.01)"; }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                  <StatusDot status={c.status} />
                </div>
                {c.total_sent > 0 ? (
                  <div style={{ display: "flex", gap: 16 }}>
                    {[
                      { label: "Enviados", val: c.total_sent },
                      { label: "Entregues", val: c.total_delivered },
                      { label: "Aberturas", val: c.total_opened },
                      { label: "Bounces", val: c.total_bounced },
                    ].map(m => (
                      <span key={m.label} style={{ fontSize: 11, color: C.textDim }}>
                        {m.label}: <span style={{
                          fontWeight: 600,
                          color: m.label === "Bounces" && m.val > 0 ? C.warning : C.textMuted,
                          fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                        }}>{(m.val || 0).toLocaleString("pt-BR")}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: 12, color: C.textDim, fontStyle: "italic" }}>
                    {c.status === "scheduled" && c.scheduled_at
                      ? `Agendado para ${new Date(c.scheduled_at).toLocaleDateString("pt-BR")}`
                      : "Sem envios ainda"}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
