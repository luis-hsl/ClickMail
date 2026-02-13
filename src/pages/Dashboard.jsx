import { useState, useEffect } from "react";
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import {
  Send, Mail, MousePointerClick, AlertTriangle, TrendingUp, Users, Shield, Flame,
  ArrowUpRight, ArrowDownRight, Globe, ChevronRight, LayoutDashboard, Settings,
  Activity, Zap, Clock, CheckCircle2, XCircle, AlertCircle
} from "lucide-react";

// ── Design Tokens ──
const COLORS = {
  bg: "#09090b",
  card: "#18181b",
  cardHover: "#1f1f23",
  border: "#27272a",
  borderLight: "#3f3f46",
  text: "#fafafa",
  textMuted: "#a1a1aa",
  textDim: "#71717a",
  accent: "#10b981",      // emerald
  accentLight: "#34d399",
  accentDim: "#059669",
  accentBg: "rgba(16,185,129,0.1)",
  danger: "#ef4444",
  dangerBg: "rgba(239,68,68,0.1)",
  warning: "#f59e0b",
  warningBg: "rgba(245,158,11,0.1)",
  info: "#3b82f6",
  infoBg: "rgba(59,130,246,0.1)",
};

// ── Mock Data ──
const sendingData = Array.from({ length: 14 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - 13 + i);
  const base = Math.floor(50 + i * 40 + Math.random() * 80);
  return {
    day: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    enviados: base,
    entregues: Math.floor(base * (0.94 + Math.random() * 0.05)),
    bounces: Math.floor(base * (0.01 + Math.random() * 0.02)),
  };
});

const warmupData = [
  { hora: "08h", emails: 10 }, { hora: "09h", emails: 15 }, { hora: "10h", emails: 20 },
  { hora: "11h", emails: 25 }, { hora: "12h", emails: 20 }, { hora: "13h", emails: 15 },
  { hora: "14h", emails: 30 }, { hora: "15h", emails: 35 }, { hora: "16h", emails: 25 },
  { hora: "17h", emails: 20 }, { hora: "18h", emails: 10 },
];

const reputationBreakdown = [
  { name: "SPF Pass", value: 98, color: COLORS.accent },
  { name: "DKIM Pass", value: 97, color: COLORS.accentLight },
  { name: "DMARC Pass", value: 96, color: COLORS.accentDim },
];

const recentCampaigns = [
  { name: "Welcome Series — Var. A", status: "sending", sent: 234, delivered: 229, opens: 78, bounces: 2 },
  { name: "Newsletter #12 — Var. C", status: "completed", sent: 1850, delivered: 1823, opens: 612, bounces: 14 },
  { name: "Reengagement Flow", status: "scheduled", sent: 0, delivered: 0, opens: 0, bounces: 0 },
];

// ── Subcomponents ──
const StatusDot = ({ status }) => {
  const map = {
    sending: { color: COLORS.accent, label: "Enviando", pulse: true },
    completed: { color: COLORS.textDim, label: "Concluído", pulse: false },
    scheduled: { color: COLORS.warning, label: "Agendado", pulse: false },
  };
  const s = map[status] || map.scheduled;
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
    background: COLORS.card, borderRadius: 16, padding: "20px 24px",
    border: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column", gap: 12,
    transition: "all 0.2s", cursor: "default",
  }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.borderLight; e.currentTarget.style.background = COLORS.cardHover; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.background = COLORS.card; }}
  >
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12, background: accentBg || COLORS.accentBg,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={20} color={accentColor || COLORS.accent} />
      </div>
      {change && (
        <span style={{
          display: "flex", alignItems: "center", gap: 2, fontSize: 12, fontWeight: 600,
          color: changeType === "up" ? COLORS.accent : COLORS.danger,
        }}>
          {changeType === "up" ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {change}
        </span>
      )}
    </div>
    <div>
      <p style={{ fontSize: 13, color: COLORS.textDim, marginBottom: 4, fontWeight: 500 }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 700, color: COLORS.text, letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</p>
    </div>
  </div>
);

const SidebarItem = ({ icon: Icon, label, active, badge }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderRadius: 10,
    cursor: "pointer", transition: "all 0.15s", position: "relative",
    background: active ? COLORS.accentBg : "transparent",
    color: active ? COLORS.accent : COLORS.textDim,
  }}
    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = COLORS.text; }}}
    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = COLORS.textDim; }}}
  >
    {active && <div style={{
      position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
      width: 3, height: 20, borderRadius: 4, background: COLORS.accent,
    }} />}
    <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
    <span style={{ fontSize: 14, fontWeight: active ? 600 : 400, flex: 1 }}>{label}</span>
    {badge && (
      <span style={{
        fontSize: 11, fontWeight: 700, background: COLORS.accent, color: COLORS.bg,
        padding: "2px 7px", borderRadius: 6, minWidth: 20, textAlign: "center",
      }}>{badge}</span>
    )}
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#1c1c1f", border: `1px solid ${COLORS.borderLight}`, borderRadius: 10,
      padding: "10px 14px", boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
    }}>
      <p style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ fontSize: 13, color: p.color, fontWeight: 600 }}>
          {p.name}: {p.value.toLocaleString("pt-BR")}
        </p>
      ))}
    </div>
  );
};

// ── Main Dashboard ──
export default function ClickmailDashboard() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{
      display: "flex", minHeight: "100vh", background: COLORS.bg,
      fontFamily: "'DM Sans', 'SF Pro Display', -apple-system, sans-serif",
      color: COLORS.text,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap');
        @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.5 } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-8px) } to { opacity: 1; transform: translateX(0) } }
        ::-webkit-scrollbar { width: 6px }
        ::-webkit-scrollbar-track { background: transparent }
        ::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 3px }
        * { margin: 0; padding: 0; box-sizing: border-box }
      `}</style>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 240, background: "#0c0c0e", borderRight: `1px solid ${COLORS.border}`,
        display: "flex", flexDirection: "column", flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{
          padding: "24px 20px 20px", display: "flex", alignItems: "center", gap: 10,
          borderBottom: `1px solid ${COLORS.border}`,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDim})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 4px 12px rgba(16,185,129,0.25)`,
          }}>
            <Zap size={20} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.03em" }}>Clickmail</span>
            <span style={{
              display: "block", fontSize: 10, color: COLORS.textDim, fontWeight: 500,
              letterSpacing: "0.05em", textTransform: "uppercase",
            }}>by Oneclick</span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "0.08em", padding: "8px 16px 6px", }}>Principal</p>
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active />
          <SidebarItem icon={Globe} label="Domínios" />
          <SidebarItem icon={Users} label="Listas" badge="3" />
          <SidebarItem icon={Send} label="Campanhas" />
          <div style={{ height: 16 }} />
          <p style={{ fontSize: 10, fontWeight: 600, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "0.08em", padding: "8px 16px 6px", }}>Sistema</p>
          <SidebarItem icon={Flame} label="Aquecimento" />
          <SidebarItem icon={Shield} label="Reputação" />
          <SidebarItem icon={Settings} label="Config" />
        </nav>

        {/* Status */}
        <div style={{ padding: "16px 16px 20px", borderTop: `1px solid ${COLORS.border}` }}>
          <div style={{
            background: COLORS.accentBg, borderRadius: 12, padding: "12px 14px",
            border: `1px solid rgba(16,185,129,0.15)`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <Activity size={14} color={COLORS.accent} />
              <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.accent }}>Aquecimento Ativo</span>
            </div>
            <div style={{ background: "rgba(16,185,129,0.15)", borderRadius: 4, height: 4, overflow: "hidden" }}>
              <div style={{ width: "35%", height: "100%", background: COLORS.accent, borderRadius: 4, transition: "width 1s" }} />
            </div>
            <p style={{ fontSize: 11, color: COLORS.textDim, marginTop: 6 }}>Dia 5 de 30 — 225 emails/dia</p>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, overflow: "auto", padding: "28px 36px" }}>
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          marginBottom: 28, animation: "fadeIn 0.4s ease-out",
        }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>
              Dashboard
            </h1>
            <p style={{ fontSize: 14, color: COLORS.textDim }}>
              {time.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
              {" · "}<span style={{ color: COLORS.accent }}>oneclickfy.com</span>
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{
              padding: "8px 16px", borderRadius: 10, border: `1px solid ${COLORS.border}`,
              background: COLORS.card, color: COLORS.textMuted, fontSize: 13, fontWeight: 500,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
            }}>
              <Clock size={14} /> Últimos 14 dias
            </button>
            <button style={{
              padding: "8px 20px", borderRadius: 10, border: "none",
              background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDim})`,
              color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
              boxShadow: `0 4px 16px rgba(16,185,129,0.3)`,
            }}>
              <Send size={14} /> Nova Campanha
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24,
          animation: "fadeIn 0.5s ease-out 0.1s both",
        }}>
          <MetricCard icon={Send} label="Emails Enviados" value="2,084" change="+24%" changeType="up" />
          <MetricCard icon={CheckCircle2} label="Taxa de Entrega" value="98.2%" change="+1.3%" changeType="up" />
          <MetricCard icon={MousePointerClick} label="Taxa de Abertura" value="33.1%" change="+5.2%" changeType="up" />
          <MetricCard icon={AlertTriangle} label="Taxa de Bounce" value="1.4%"
            change="-0.3%" changeType="up"
            accentColor={COLORS.warning} accentBg={COLORS.warningBg}
          />
        </div>

        {/* Charts Row */}
        <div style={{
          display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 24,
          animation: "fadeIn 0.5s ease-out 0.2s both",
        }}>
          {/* Sending Chart */}
          <div style={{
            background: COLORS.card, borderRadius: 16, border: `1px solid ${COLORS.border}`,
            padding: "20px 24px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>Volume de Envio</h3>
                <p style={{ fontSize: 12, color: COLORS.textDim, marginTop: 2 }}>Últimos 14 dias</p>
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                {[{ label: "Entregues", color: COLORS.accent }, { label: "Bounces", color: COLORS.danger }].map(l => (
                  <span key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: COLORS.textMuted }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
                    {l.label}
                  </span>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={sendingData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.accent} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={COLORS.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} vertical={false} />
                <XAxis dataKey="day" stroke={COLORS.textDim} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={COLORS.textDim} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="entregues" stroke={COLORS.accent} strokeWidth={2} fill="url(#gradGreen)" name="Entregues" />
                <Area type="monotone" dataKey="bounces" stroke={COLORS.danger} strokeWidth={1.5} fill="none" name="Bounces" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Reputation Card */}
          <div style={{
            background: COLORS.card, borderRadius: 16, border: `1px solid ${COLORS.border}`,
            padding: "20px 24px", display: "flex", flexDirection: "column",
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Reputação do Domínio</h3>
            <p style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 16 }}>oneclickfy.com</p>

            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ position: "relative", width: 140, height: 140 }}>
                <svg viewBox="0 0 140 140" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="70" cy="70" r="58" fill="none" stroke={COLORS.border} strokeWidth="8" />
                  <circle cx="70" cy="70" r="58" fill="none" stroke={COLORS.accent} strokeWidth="8"
                    strokeDasharray={`${0.97 * 2 * Math.PI * 58} ${2 * Math.PI * 58}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div style={{
                  position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em", color: COLORS.accent }}>97</span>
                  <span style={{ fontSize: 11, color: COLORS.textDim, fontWeight: 500 }}>/ 100</span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
              {reputationBreakdown.map(item => (
                <div key={item.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <CheckCircle2 size={14} color={item.color} />
                  <span style={{ fontSize: 12, color: COLORS.textMuted, flex: 1 }}>{item.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: item.color, fontFamily: "'JetBrains Mono', monospace" }}>
                    {item.value}%
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
            background: COLORS.card, borderRadius: 16, border: `1px solid ${COLORS.border}`,
            padding: "20px 24px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>Aquecimento Hoje</h3>
                <p style={{ fontSize: 12, color: COLORS.textDim, marginTop: 2 }}>225 de 250 emails enviados</p>
              </div>
              <span style={{
                background: COLORS.accentBg, color: COLORS.accent,
                fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 8,
              }}>
                <Flame size={12} style={{ display: "inline", verticalAlign: -2, marginRight: 4 }} />
                Dia 5/30
              </span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={warmupData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} vertical={false} />
                <XAxis dataKey="hora" stroke={COLORS.textDim} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={COLORS.textDim} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="emails" name="Emails" fill={COLORS.accent} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Recent Campaigns */}
          <div style={{
            background: COLORS.card, borderRadius: 16, border: `1px solid ${COLORS.border}`,
            padding: "20px 24px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>Campanhas Recentes</h3>
              <span style={{ fontSize: 12, color: COLORS.accent, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 2 }}>
                Ver todas <ChevronRight size={14} />
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {recentCampaigns.map((c, i) => (
                <div key={i} style={{
                  padding: "12px 14px", borderRadius: 12, border: `1px solid ${COLORS.border}`,
                  background: "rgba(255,255,255,0.01)", cursor: "pointer", transition: "all 0.15s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.borderLight; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.background = "rgba(255,255,255,0.01)"; }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                    <StatusDot status={c.status} />
                  </div>
                  {c.status !== "scheduled" ? (
                    <div style={{ display: "flex", gap: 16 }}>
                      {[
                        { label: "Enviados", val: c.sent },
                        { label: "Entregues", val: c.delivered },
                        { label: "Aberturas", val: c.opens },
                        { label: "Bounces", val: c.bounces },
                      ].map(m => (
                        <span key={m.label} style={{ fontSize: 11, color: COLORS.textDim }}>
                          {m.label}: <span style={{
                            fontWeight: 600, color: m.label === "Bounces" && m.val > 0 ? COLORS.warning : COLORS.textMuted,
                            fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                          }}>{m.val.toLocaleString("pt-BR")}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: COLORS.textDim, fontStyle: "italic" }}>Envio programado para amanhã 08h</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
