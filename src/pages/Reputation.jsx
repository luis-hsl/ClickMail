import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Shield, Loader2, CheckCircle2, XCircle, AlertTriangle, Globe,
  Send, ArrowUpRight, ArrowDownRight, Flame, TrendingUp, TrendingDown,
  AlertCircle, Info, ExternalLink,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { C } from "@/theme/colors";
import { SkeletonCard, SkeletonChart } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#1c1c1f", border: `1px solid ${C.borderLight}`, borderRadius: 10,
      padding: "10px 14px", boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
    }}>
      <p style={{ fontSize: 11, color: C.textDim, marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ fontSize: 13, color: p.color, fontWeight: 600 }}>
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(2) : p.value}
        </p>
      ))}
    </div>
  );
}

function scoreColor(score) {
  if (score >= 80) return C.accent;
  if (score >= 60) return C.accentDim;
  if (score >= 40) return C.warning;
  return C.danger;
}

function DnsDetail({ label, configured, record, description }) {
  return (
    <div style={{
      padding: "16px 18px", borderRadius: 14, border: `1px solid ${C.border}`,
      background: "rgba(255,255,255,0.01)", transition: "border-color 0.15s",
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = C.borderLight}
      onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {configured
            ? <CheckCircle2 size={18} color={C.accent} />
            : <XCircle size={18} color={C.danger} />
          }
          <span style={{ fontSize: 16, fontWeight: 700 }}>{label}</span>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 6,
          background: configured ? C.accentBg : C.dangerBg,
          color: configured ? C.accent : C.danger,
        }}>
          {configured ? "Verificado" : "Pendente"}
        </span>
      </div>
      <p style={{ fontSize: 12, color: C.textDim, marginBottom: 6, lineHeight: 1.5 }}>{description}</p>
      {record && (
        <code style={{
          display: "block", fontSize: 11, color: C.textMuted, background: C.bg,
          padding: "8px 10px", borderRadius: 8, fontFamily: "'JetBrains Mono', monospace",
          wordBreak: "break-all", lineHeight: 1.5,
        }}>{record}</code>
      )}
    </div>
  );
}

function AlertCard({ type, title, description }) {
  const config = {
    danger: { icon: AlertTriangle, color: C.danger, bg: C.dangerBg, border: "rgba(239,68,68,0.2)" },
    warning: { icon: AlertCircle, color: C.warning, bg: C.warningBg, border: "rgba(245,158,11,0.2)" },
    info: { icon: Info, color: C.info, bg: C.infoBg, border: "rgba(59,130,246,0.2)" },
    success: { icon: CheckCircle2, color: C.accent, bg: C.accentBg, border: "rgba(16,185,129,0.2)" },
  };
  const c = config[type] || config.info;
  const Icon = c.icon;
  return (
    <div style={{
      padding: "14px 16px", borderRadius: 12, border: `1px solid ${c.border}`,
      background: c.bg, display: "flex", gap: 12, alignItems: "flex-start",
    }}>
      <Icon size={18} color={c.color} style={{ flexShrink: 0, marginTop: 1 }} />
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: c.color, marginBottom: 2 }}>{title}</p>
        <p style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>{description}</p>
      </div>
    </div>
  );
}

export default function Reputation() {
  const [domains, setDomains] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [historyData, setHistoryData] = useState([]);
  const [deliverabilityData, setDeliverabilityData] = useState([]);
  const navigate = useNavigate();

  const loadDomains = async () => {
    try {
      const { data } = await supabase
        .from("email_domains")
        .select("*")
        .order("created_at", { ascending: false });
      setDomains(data || []);
      if (!selected && data?.length > 0) setSelected(data[0]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDomains(); }, []);

  // Realtime: subscribe to domain reputation changes
  useEffect(() => {
    const channel = supabase
      .channel("reputation-realtime")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "email_domains" }, () => loadDomains())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (!selected) return;

    async function loadMetrics() {
      // Build synthetic history from warmup_schedule data across all campaigns for this domain
      const { data: campaigns } = await supabase
        .from("email_campaigns")
        .select("id")
        .eq("domain_id", selected.id);

      if (!campaigns || campaigns.length === 0) {
        setHistoryData([]);
        setDeliverabilityData([]);
        return;
      }

      const campaignIds = campaigns.map(c => c.id);
      const { data: schedule } = await supabase
        .from("warmup_schedule")
        .select("*")
        .in("campaign_id", campaignIds)
        .eq("status", "completed")
        .order("scheduled_date", { ascending: true });

      if (schedule && schedule.length > 0) {
        // Group by date
        const byDate = {};
        schedule.forEach(s => {
          const d = s.scheduled_date;
          if (!byDate[d]) byDate[d] = { sent: 0, delivered: 0, bounced: 0, opened: 0, complained: 0 };
          byDate[d].sent += s.actual_sent || 0;
          byDate[d].delivered += s.delivered || 0;
          byDate[d].bounced += s.bounced || 0;
          byDate[d].opened += s.opened || 0;
          byDate[d].complained += s.complained || 0;
        });

        const dates = Object.keys(byDate).sort();
        let cumScore = selected.reputation_score;

        setDeliverabilityData(dates.map(d => {
          const m = byDate[d];
          return {
            date: new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
            deliveryRate: m.sent > 0 ? (m.delivered / m.sent * 100) : 0,
            bounceRate: m.sent > 0 ? (m.bounced / m.sent * 100) : 0,
            complaintRate: m.sent > 0 ? (m.complained / m.sent * 100) : 0,
          };
        }));

        // Synthetic reputation history
        setHistoryData(dates.map((d, i) => {
          const m = byDate[d];
          const bounceImpact = m.sent > 0 ? (m.bounced / m.sent * 100) : 0;
          const delta = bounceImpact > 5 ? -3 : bounceImpact > 2 ? -1 : 1;
          cumScore = Math.max(0, Math.min(100, cumScore + delta));
          return {
            date: new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
            score: cumScore,
          };
        }));
      } else {
        setHistoryData([]);
        setDeliverabilityData([]);
      }
    }
    loadMetrics();
  }, [selected]);

  const generateAlerts = () => {
    if (!selected) return [];
    const alerts = [];

    if (!selected.dkim_configured) {
      alerts.push({ type: "danger", title: "DKIM não configurado", description: "Sem DKIM, seus emails podem ser marcados como spam. Configure os 3 registros CNAME do Amazon SES no seu DNS." });
    }
    if (!selected.spf_configured) {
      alerts.push({ type: "danger", title: "SPF não configurado", description: "Adicione o registro TXT 'v=spf1 include:amazonses.com ~all' no DNS do seu domínio." });
    }
    if (!selected.dmarc_configured) {
      alerts.push({ type: "warning", title: "DMARC não configurado", description: "DMARC protege contra spoofing. Adicione: v=DMARC1; p=quarantine; rua=mailto:dmarc@" + selected.domain });
    }
    if (Number(selected.bounce_rate) > 5) {
      alerts.push({ type: "danger", title: "Bounce rate elevado", description: `Sua taxa de bounce está em ${Number(selected.bounce_rate).toFixed(1)}%. Considere limpar sua lista de contatos removendo emails inválidos.` });
    } else if (Number(selected.bounce_rate) > 2) {
      alerts.push({ type: "warning", title: "Bounce rate subindo", description: `Taxa de bounce em ${Number(selected.bounce_rate).toFixed(1)}%. Monitore e considere verificar sua lista com o MillionVerifier.` });
    }
    if (Number(selected.complaint_rate) > 0.1) {
      alerts.push({ type: "danger", title: "Complaint rate alto", description: `Taxa de reclamação em ${Number(selected.complaint_rate).toFixed(2)}%. Revise o conteúdo dos emails e garanta que só envia para quem optou por receber.` });
    }
    if (selected.reputation_score >= 80 && selected.spf_configured && selected.dkim_configured && selected.dmarc_configured) {
      alerts.push({ type: "success", title: "Domínio saudável", description: "Sua autenticação DNS está completa e a reputação está boa. Continue monitorando as métricas." });
    }

    return alerts;
  };

  if (loading) {
    return (
      <div className="cm-page" style={{ padding: "28px 36px", background: C.bg, minHeight: "100vh" }}>
        <div style={{ marginBottom: 28, height: 50 }} />
        <SkeletonCard count={4} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 24 }}>
          <SkeletonChart height={280} />
          <SkeletonChart height={280} />
        </div>
      </div>
    );
  }

  const alerts = generateAlerts();
  const circumference = 2 * Math.PI * 70;
  const repScore = selected?.reputation_score || 0;
  const repColor = scoreColor(repScore);

  return (
    <div className="cm-page" style={{
      padding: "28px 36px", background: C.bg, minHeight: "100vh",
      fontFamily: "'DM Sans', sans-serif", color: C.text,
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>

      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        marginBottom: 28, animation: "fadeIn 0.4s ease-out",
      }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>
            Reputação
          </h1>
          <p style={{ fontSize: 14, color: C.textDim }}>
            Monitore a saúde e entregabilidade dos seus domínios
          </p>
        </div>
      </div>

      {domains.length === 0 ? (
        <div style={{
          background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
          animation: "fadeIn 0.4s ease-out 0.1s both",
        }}>
          <EmptyState
            icon="chart"
            title="Nenhum domínio cadastrado"
            description="Adicione um domínio para começar a monitorar a reputação."
            action={{ label: "Ir para Domínios", onClick: () => navigate("/domains") }}
          />
        </div>
      ) : (
        <>
          {/* Domain Selector */}
          {domains.length > 1 && (
            <div style={{
              display: "flex", gap: 8, marginBottom: 20, animation: "fadeIn 0.4s ease-out 0.05s both",
            }}>
              {domains.map(d => (
                <button key={d.id} onClick={() => setSelected(d)} style={{
                  padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer",
                  border: `1px solid ${selected?.id === d.id ? C.accent : C.border}`,
                  background: selected?.id === d.id ? C.accentBg : "transparent",
                  color: selected?.id === d.id ? C.accent : C.textDim,
                  display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s",
                }}>
                  <Globe size={14} /> {d.domain}
                </button>
              ))}
            </div>
          )}

          {selected && (
            <>
              {/* Score + DNS Row */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16, marginBottom: 24,
                animation: "fadeIn 0.5s ease-out 0.1s both",
              }}>
                {/* Score Gauge */}
                <div style={{
                  background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
                  padding: "28px", display: "flex", flexDirection: "column", alignItems: "center",
                }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, alignSelf: "flex-start" }}>Score Geral</h3>
                  <p style={{ fontSize: 12, color: C.textDim, marginBottom: 20, alignSelf: "flex-start" }}>{selected.domain}</p>

                  <div style={{ position: "relative", width: 170, height: 170, marginBottom: 16 }}>
                    <svg viewBox="0 0 170 170" style={{ transform: "rotate(-90deg)" }}>
                      <circle cx="85" cy="85" r="70" fill="none" stroke={C.border} strokeWidth="10" />
                      <circle cx="85" cy="85" r="70" fill="none"
                        stroke={repColor} strokeWidth="10"
                        strokeDasharray={`${(repScore / 100) * circumference} ${circumference}`}
                        strokeLinecap="round"
                        style={{ transition: "stroke-dasharray 1s ease-out" }}
                      />
                    </svg>
                    <div style={{
                      position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{
                        fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em", color: repColor,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>{repScore}</span>
                      <span style={{ fontSize: 12, color: C.textDim, fontWeight: 500 }}>/ 100</span>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { label: "Total enviado", value: (selected.total_sent || 0).toLocaleString("pt-BR"), icon: Send },
                      { label: "Entregues", value: (selected.total_delivered || 0).toLocaleString("pt-BR"), icon: CheckCircle2 },
                      { label: "Bounce rate", value: `${Number(selected.bounce_rate || 0).toFixed(2)}%`, icon: AlertTriangle, color: Number(selected.bounce_rate || 0) > 5 ? C.danger : C.accent },
                      { label: "Complaint rate", value: `${Number(selected.complaint_rate || 0).toFixed(3)}%`, icon: XCircle, color: Number(selected.complaint_rate || 0) > 0.1 ? C.danger : C.accent },
                    ].map(s => (
                      <div key={s.label} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.border}`,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <s.icon size={13} color={s.color || C.textDim} />
                          <span style={{ fontSize: 12, color: C.textDim }}>{s.label}</span>
                        </div>
                        <span style={{
                          fontSize: 13, fontWeight: 700, color: s.color || C.text,
                          fontFamily: "'JetBrains Mono', monospace",
                        }}>{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* DNS Breakdown */}
                <div style={{
                  background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
                  padding: "24px",
                }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Autenticação DNS</h3>
                  <p style={{ fontSize: 12, color: C.textDim, marginBottom: 20 }}>
                    {[selected.spf_configured, selected.dkim_configured, selected.dmarc_configured].filter(Boolean).length}/3 verificações completas
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <DnsDetail
                      label="SPF (Sender Policy Framework)"
                      configured={selected.spf_configured}
                      record={selected.spf_record}
                      description="Define quais servidores IP estão autorizados a enviar emails em nome do seu domínio. Provedor: Amazon SES."
                    />
                    <DnsDetail
                      label="DKIM (DomainKeys Identified Mail)"
                      configured={selected.dkim_configured}
                      record={selected.dkim_selector ? `Selector: ${selected.dkim_selector}` : "3 registros CNAME gerados pelo Amazon SES"}
                      description="Adiciona uma assinatura criptográfica aos emails para provar que não foram alterados em trânsito."
                    />
                    <DnsDetail
                      label="DMARC (Domain-based Message Authentication)"
                      configured={selected.dmarc_configured}
                      record={selected.dmarc_policy}
                      description="Define a política de rejeição quando SPF ou DKIM falham. Protege contra phishing e spoofing."
                    />
                  </div>
                </div>
              </div>

              {/* Charts Row */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24,
                animation: "fadeIn 0.5s ease-out 0.2s both",
              }}>
                {/* Reputation History */}
                <div style={{
                  background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: "20px 24px",
                }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Histórico de Reputação</h3>
                  <p style={{ fontSize: 12, color: C.textDim, marginBottom: 16 }}>Score ao longo do tempo</p>
                  {historyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={historyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradScore" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={C.accent} stopOpacity={0.2} />
                            <stop offset="100%" stopColor={C.accent} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                        <XAxis dataKey="date" stroke={C.textDim} fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis domain={[0, 100]} stroke={C.textDim} fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="score" name="Score" stroke={C.accent} strokeWidth={2} fill="url(#gradScore)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 220, color: C.textDim, fontSize: 13 }}>
                      Dados disponíveis após os primeiros envios
                    </div>
                  )}
                </div>

                {/* Deliverability Trends */}
                <div style={{
                  background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: "20px 24px",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 700 }}>Entregabilidade</h3>
                      <p style={{ fontSize: 12, color: C.textDim, marginTop: 2 }}>Delivery, bounce e complaint rates</p>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      {[
                        { label: "Delivery", color: C.accent },
                        { label: "Bounce", color: C.warning },
                        { label: "Complaint", color: C.danger },
                      ].map(l => (
                        <span key={l.label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: C.textMuted }}>
                          <span style={{ width: 6, height: 6, borderRadius: 1, background: l.color }} />
                          {l.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  {deliverabilityData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={deliverabilityData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                        <XAxis dataKey="date" stroke={C.textDim} fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke={C.textDim} fontSize={10} tickLine={false} axisLine={false} unit="%" />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="deliveryRate" name="Delivery %" stroke={C.accent} strokeWidth={2} dot={{ r: 2 }} />
                        <Line type="monotone" dataKey="bounceRate" name="Bounce %" stroke={C.warning} strokeWidth={2} dot={{ r: 2 }} />
                        <Line type="monotone" dataKey="complaintRate" name="Complaint %" stroke={C.danger} strokeWidth={2} dot={{ r: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 220, color: C.textDim, fontSize: 13 }}>
                      Dados disponíveis após os primeiros envios
                    </div>
                  )}
                </div>
              </div>

              {/* Alerts & Recommendations */}
              <div style={{
                background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
                padding: "24px", animation: "fadeIn 0.5s ease-out 0.3s both",
              }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
                  Alertas e Recomendações
                </h3>
                {alerts.length === 0 ? (
                  <div style={{ padding: "20px 0", textAlign: "center", color: C.textDim, fontSize: 13 }}>
                    Nenhum alerta no momento
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {alerts.map((a, i) => (
                      <AlertCard key={i} type={a.type} title={a.title} description={a.description} />
                    ))}
                  </div>
                )}
              </div>

              {/* Blacklist Check */}
              <div style={{
                background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
                padding: "24px", marginTop: 16, animation: "fadeIn 0.5s ease-out 0.35s both",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Blacklist Check</h3>
                    <p style={{ fontSize: 12, color: C.textDim }}>
                      Verifique se {selected.domain} está em listas negras de email conhecidas
                    </p>
                  </div>
                  <a
                    href={`https://mxtoolbox.com/SuperTool.aspx?action=blacklist%3a${selected.domain}&run=toolpage`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: "9px 18px", borderRadius: 10, border: `1px solid ${C.border}`,
                      background: C.card, color: C.textMuted, fontSize: 13, fontWeight: 500,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                      textDecoration: "none", transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; }}
                  >
                    <ExternalLink size={14} /> Verificar no MXToolbox
                  </a>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
