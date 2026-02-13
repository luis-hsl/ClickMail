import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  ArrowLeft, Send, CheckCircle2, MousePointerClick, AlertTriangle, XCircle,
  Loader2, Flame, Globe, Users, Calendar, Clock, Pause, Play, X as XIcon,
  ChevronLeft, ChevronRight, Mail, Eye, Sparkles,
} from "lucide-react";
import { campaignService, sendService, warmupService, n8nService } from "@/services/api";
import { supabase } from "@/lib/supabase";
import { C } from "@/theme/colors";
import { SkeletonCard, SkeletonChart, SkeletonTable } from "@/components/ui/Skeleton";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useToast } from "@/contexts/ToastContext";

const statusMap = {
  draft: { color: C.textDim, bg: "rgba(113,113,122,0.1)", label: "Rascunho" },
  scheduled: { color: C.info, bg: C.infoBg, label: "Agendada" },
  warming_up: { color: C.warning, bg: C.warningBg, label: "Aquecendo", pulse: true },
  sending: { color: C.accent, bg: C.accentBg, label: "Enviando", pulse: true },
  paused: { color: C.warning, bg: C.warningBg, label: "Pausada" },
  completed: { color: C.accent, bg: C.accentBg, label: "Concluída" },
  failed: { color: C.danger, bg: C.dangerBg, label: "Falhou" },
};

const sendStatusColors = {
  queued: C.textDim,
  sent: C.info,
  delivered: C.accent,
  opened: C.accent,
  clicked: C.accent,
  bounced: C.danger,
  complained: C.danger,
  failed: C.danger,
};

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
          {p.name}: {p.value.toLocaleString("pt-BR")}
        </p>
      ))}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color }) {
  return (
    <div style={{
      background: C.card, borderRadius: 14, padding: "16px 18px",
      border: `1px solid ${C.border}`, transition: "all 0.2s",
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderLight; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Icon size={16} color={color || C.accent} />
        <span style={{ fontSize: 12, color: C.textDim, fontWeight: 500 }}>{label}</span>
      </div>
      <p style={{
        fontSize: 24, fontWeight: 700, color: color || C.text,
        fontFamily: "'JetBrains Mono', monospace", lineHeight: 1,
      }}>{value}</p>
    </div>
  );
}

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sends, setSends] = useState([]);
  const [sendCount, setSendCount] = useState(0);
  const [sendPage, setSendPage] = useState(0);
  const [sendFilter, setSendFilter] = useState(null);
  const [sendsLoading, setSendsLoading] = useState(false);
  const [chartData, setChartData] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const toast = useToast();
  const limit = 30;

  const loadCampaign = async () => {
    try {
      const data = await campaignService.getById(id);
      setCampaign(data);
      buildChart(data);
    } catch (err) {
      console.error("Error loading campaign:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadSends = async () => {
    setSendsLoading(true);
    try {
      const { data, count } = await sendService.listByCampaign(id, { page: sendPage, limit, status: sendFilter });
      setSends(data || []);
      setSendCount(count || 0);
    } catch (err) {
      console.error("Error loading sends:", err);
    } finally {
      setSendsLoading(false);
    }
  };

  const buildChart = (camp) => {
    const schedule = camp?.warmup_schedule || [];
    if (schedule.length > 0) {
      setChartData(schedule.map(s => ({
        dia: `D${s.day_number}`,
        planejado: s.planned_volume,
        enviado: s.actual_sent || 0,
        entregue: s.delivered || 0,
        bounce: s.bounced || 0,
      })));
    }
  };

  useEffect(() => { loadCampaign(); }, [id]);
  useEffect(() => { loadSends(); }, [sendPage, sendFilter]);

  // Realtime: subscribe to sends, warmup, and campaign metric updates
  useEffect(() => {
    const channel = supabase
      .channel(`campaign-${id}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "email_sends",
        filter: `campaign_id=eq.${id}`,
      }, () => { loadSends(); loadCampaign(); })
      .on("postgres_changes", {
        event: "*", schema: "public", table: "warmup_schedule",
        filter: `campaign_id=eq.${id}`,
      }, () => { loadCampaign(); })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "email_campaigns",
        filter: `id=eq.${id}`,
      }, () => { loadCampaign(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const handleAction = async (newStatus) => {
    setActionLoading(true);
    try {
      // When starting campaign with warmup, generate warmup schedule first
      if (newStatus === "warming_up" && campaign.use_warmup && (!campaign.warmup_schedule || campaign.warmup_schedule.length === 0)) {
        await warmupService.generateSchedule(id, {
          startVolume: campaign.warmup_start_volume || 50,
          incrementPercent: campaign.warmup_increment_percent || 30,
          maxDaily: campaign.warmup_max_daily || 5000,
          totalRecipients: campaign.total_recipients || 0,
        });
      }
      await campaignService.update(id, { status: newStatus });
      await loadCampaign();
    } catch (err) {
      console.error("Error updating campaign:", err);
      toast.error("Erro: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const [generatingVariants, setGeneratingVariants] = useState(false);
  const handleGenerateVariants = async () => {
    setGeneratingVariants(true);
    try {
      await n8nService.triggerGenerateVariants(id);
      await loadCampaign();
    } catch (err) {
      toast.error("Erro ao gerar variações: " + err.message);
    } finally {
      setGeneratingVariants(false);
    }
  };

  if (loading) {
    return (
      <div className="cm-page" style={{ padding: "28px 36px", background: C.bg, minHeight: "100vh" }}>
        <div style={{ marginBottom: 28, height: 50 }} />
        <SkeletonCard count={4} />
        <div style={{ marginTop: 24 }}><SkeletonChart height={260} /></div>
        <div style={{ marginTop: 24 }}><SkeletonTable rows={5} cols={5} /></div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div style={{
        padding: "28px 36px", background: C.bg, minHeight: "100vh",
        fontFamily: "'DM Sans', sans-serif", color: C.text,
      }}>
        <p style={{ color: C.textDim }}>Campanha não encontrada.</p>
      </div>
    );
  }

  const st = statusMap[campaign.status] || statusMap.draft;
  const variants = campaign.email_variants || [];
  const warmup = campaign.warmup_schedule || [];
  const warmupCompleted = warmup.filter(w => w.status === "completed").length;
  const totalPages = Math.ceil(sendCount / limit);

  return (
    <div className="cm-page" style={{
      padding: "28px 36px", background: C.bg, minHeight: "100vh",
      fontFamily: "'DM Sans', sans-serif", color: C.text,
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.5 } }
      `}</style>

      {/* Header */}
      <div style={{ animation: "fadeIn 0.4s ease-out" }}>
        <button onClick={() => navigate("/campaigns")} style={{
          background: "none", border: `1px solid ${C.border}`, borderRadius: 8,
          padding: "7px 12px", cursor: "pointer", color: C.textDim, fontSize: 13,
          display: "flex", alignItems: "center", gap: 6, marginBottom: 20, transition: "all 0.15s",
        }}
          onMouseEnter={e => { e.currentTarget.style.color = C.text; e.currentTarget.style.borderColor = C.borderLight; }}
          onMouseLeave={e => { e.currentTarget.style.color = C.textDim; e.currentTarget.style.borderColor = C.border; }}
        >
          <ArrowLeft size={14} /> Campanhas
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em" }}>
                {campaign.name}
              </h1>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 8,
                background: st.bg, color: st.color,
              }}>
                <span style={{
                  width: 7, height: 7, borderRadius: "50%", background: st.color,
                  animation: st.pulse ? "pulse 2s infinite" : "none",
                }} />
                {st.label}
              </span>
            </div>
            <div style={{ display: "flex", gap: 16, fontSize: 13, color: C.textDim }}>
              {campaign.email_domains && (
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Globe size={13} /> {campaign.email_domains.domain}
                </span>
              )}
              {campaign.email_lists && (
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Users size={13} /> {campaign.email_lists.name}
                </span>
              )}
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Mail size={13} /> {campaign.from_name} &lt;{campaign.from_email}&gt;
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: 8 }}>
            {(campaign.status === "sending" || campaign.status === "warming_up") && (
              <button onClick={() => handleAction("paused")} disabled={actionLoading} style={{
                padding: "8px 16px", borderRadius: 10, border: `1px solid ${C.border}`,
                background: C.card, color: C.warning, fontSize: 13, fontWeight: 500,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              }}>
                <Pause size={14} /> Pausar
              </button>
            )}
            {campaign.status === "paused" && (
              <button onClick={() => handleAction("sending")} disabled={actionLoading} style={{
                padding: "8px 16px", borderRadius: 10, border: "none",
                background: `linear-gradient(135deg, ${C.accent}, ${C.accentDim})`,
                color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
                boxShadow: "0 4px 16px rgba(16,185,129,0.3)",
              }}>
                <Play size={14} /> Retomar
              </button>
            )}
            {(campaign.status === "draft" || campaign.status === "scheduled") && (
              <button onClick={() => handleAction("warming_up")} disabled={actionLoading} style={{
                padding: "8px 20px", borderRadius: 10, border: "none",
                background: `linear-gradient(135deg, ${C.accent}, ${C.accentDim})`,
                color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
                boxShadow: "0 4px 16px rgba(16,185,129,0.3)",
              }}>
                <Play size={14} /> Iniciar
              </button>
            )}
            {campaign.status !== "completed" && campaign.status !== "failed" && (
              <button onClick={() => setConfirmCancel(true)} disabled={actionLoading} style={{
                padding: "8px 16px", borderRadius: 10, border: `1px solid ${C.border}`,
                background: C.card, color: C.danger, fontSize: 13, fontWeight: 500,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              }}>
                <XIcon size={14} /> Cancelar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 24,
        animation: "fadeIn 0.5s ease-out 0.1s both",
      }}>
        <MetricCard icon={Send} label="Enviados" value={(campaign.total_sent || 0).toLocaleString("pt-BR")} />
        <MetricCard icon={CheckCircle2} label="Entregues" value={(campaign.total_delivered || 0).toLocaleString("pt-BR")} color={C.accent} />
        <MetricCard icon={Eye} label="Aberturas" value={(campaign.total_opened || 0).toLocaleString("pt-BR")} color={C.info} />
        <MetricCard icon={MousePointerClick} label="Cliques" value={(campaign.total_clicked || 0).toLocaleString("pt-BR")} color={C.info} />
        <MetricCard icon={AlertTriangle} label="Bounces" value={(campaign.total_bounced || 0).toLocaleString("pt-BR")} color={C.warning} />
        <MetricCard icon={XCircle} label="Complaints" value={(campaign.total_complained || 0).toLocaleString("pt-BR")} color={C.danger} />
      </div>

      {/* Charts + Variants Row */}
      <div style={{
        display: "grid", gridTemplateColumns: warmup.length > 0 ? "1fr 1fr" : "1fr", gap: 16, marginBottom: 24,
        animation: "fadeIn 0.5s ease-out 0.2s both",
      }}>
        {/* Warmup Chart */}
        {warmup.length > 0 && (
          <div style={{
            background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: "20px 24px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>Progresso do Aquecimento</h3>
                <p style={{ fontSize: 12, color: C.textDim, marginTop: 2 }}>
                  {warmupCompleted} de {warmup.length} dias completados
                </p>
              </div>
              <span style={{
                background: C.accentBg, color: C.accent, fontSize: 12, fontWeight: 600,
                padding: "4px 10px", borderRadius: 8,
              }}>
                <Flame size={12} style={{ display: "inline", verticalAlign: -2, marginRight: 4 }} />
                {warmupCompleted}/{warmup.length}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                <XAxis dataKey="dia" stroke={C.textDim} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke={C.textDim} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="planejado" name="Planejado" fill={C.borderLight} radius={[3, 3, 0, 0]} maxBarSize={18} />
                <Bar dataKey="enviado" name="Enviado" fill={C.accent} radius={[3, 3, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Variants */}
        <div style={{
          background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: "20px 24px",
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
            Variações A/B {variants.length > 0 && `(${variants.length})`}
          </h3>
          {variants.length === 0 ? (
            <div style={{ padding: "32px 0", textAlign: "center" }}>
              <p style={{ color: C.textDim, fontSize: 13, marginBottom: 16 }}>
                Nenhuma variação criada ainda.
              </p>
              <button
                onClick={handleGenerateVariants}
                disabled={generatingVariants}
                style={{
                  padding: "9px 20px", borderRadius: 10, border: "none",
                  background: generatingVariants ? C.infoBg : "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                  color: generatingVariants ? C.info : "#fff",
                  fontSize: 13, fontWeight: 600,
                  cursor: generatingVariants ? "not-allowed" : "pointer",
                  display: "inline-flex", alignItems: "center", gap: 6,
                  boxShadow: generatingVariants ? "none" : "0 4px 16px rgba(139,92,246,0.3)",
                }}
              >
                {generatingVariants
                  ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Gerando...</>
                  : <><Sparkles size={14} /> Gerar Variações com IA</>
                }
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {variants.map(v => (
                <div key={v.id} style={{
                  padding: "12px 14px", borderRadius: 12, border: `1px solid ${C.border}`,
                  background: "rgba(255,255,255,0.01)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                        background: v.is_winner ? C.accentBg : "rgba(255,255,255,0.05)",
                        color: v.is_winner ? C.accent : C.textMuted,
                      }}>{v.variant_label}</span>
                      {v.spam_score !== null && (
                        <span style={{
                          fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                          color: Number(v.spam_score) < 3 ? C.accent : Number(v.spam_score) < 5 ? C.warning : C.danger,
                        }}>
                          Spam: {Number(v.spam_score).toFixed(1)}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 12, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
                      <span style={{ color: C.accent }}>Open {Number(v.open_rate || 0).toFixed(1)}%</span>
                      <span style={{ color: C.info }}>Click {Number(v.click_rate || 0).toFixed(1)}%</span>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{v.subject}</p>
                  {v.preview_text && (
                    <p style={{ fontSize: 12, color: C.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {v.preview_text}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Send Log */}
      <div style={{
        background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
        overflow: "hidden", animation: "fadeIn 0.5s ease-out 0.3s both",
      }}>
        <div style={{
          padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center",
          borderBottom: `1px solid ${C.border}`,
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>Log de Envios</h3>
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { val: null, label: "Todos" },
              { val: "delivered", label: "Entregues" },
              { val: "opened", label: "Abertos" },
              { val: "bounced", label: "Bounces" },
              { val: "failed", label: "Falhos" },
            ].map(f => (
              <button key={f.label} onClick={() => { setSendFilter(f.val); setSendPage(0); }} style={{
                padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500,
                border: `1px solid ${sendFilter === f.val ? C.accent : C.border}`,
                background: sendFilter === f.val ? C.accentBg : "transparent",
                color: sendFilter === f.val ? C.accent : C.textDim,
                cursor: "pointer", transition: "all 0.15s",
              }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {sendsLoading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 0" }}>
            <Loader2 size={20} color={C.accent} style={{ animation: "spin 1s linear infinite" }} />
          </div>
        ) : sends.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: C.textDim, fontSize: 13 }}>
            Nenhum envio registrado{sendFilter ? " com este filtro" : ""}
          </div>
        ) : (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {["Email", "Variação", "Status", "Enviado em", "Entregue em", "Aberto em"].map(h => (
                    <th key={h} style={{
                      padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 600,
                      color: C.textDim, textTransform: "uppercase", letterSpacing: "0.05em",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sends.map(s => (
                  <tr key={s.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{
                      padding: "10px 16px", fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
                    }}>{s.email_contacts?.email || "—"}</td>
                    <td style={{ padding: "10px 16px" }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 5,
                        background: "rgba(255,255,255,0.05)", color: C.textMuted,
                      }}>{s.email_variants?.variant_label || "—"}</span>
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        fontSize: 11, fontWeight: 600, color: sendStatusColors[s.status] || C.textDim,
                      }}>
                        <span style={{
                          width: 6, height: 6, borderRadius: "50%",
                          background: sendStatusColors[s.status] || C.textDim,
                        }} />
                        {s.status}
                      </span>
                    </td>
                    <td style={{ padding: "10px 16px", fontSize: 11, color: C.textDim, fontFamily: "'JetBrains Mono', monospace" }}>
                      {s.sent_at ? new Date(s.sent_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                    <td style={{ padding: "10px 16px", fontSize: 11, color: C.textDim, fontFamily: "'JetBrains Mono', monospace" }}>
                      {s.delivered_at ? new Date(s.delivered_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                    <td style={{ padding: "10px 16px", fontSize: 11, color: C.textDim, fontFamily: "'JetBrains Mono', monospace" }}>
                      {s.first_opened_at ? new Date(s.first_opened_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 16px", borderTop: `1px solid ${C.border}`,
              }}>
                <span style={{ fontSize: 12, color: C.textDim }}>
                  {sendPage * limit + 1}–{Math.min((sendPage + 1) * limit, sendCount)} de {sendCount}
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => setSendPage(p => Math.max(0, p - 1))} disabled={sendPage === 0} style={{
                    padding: "5px 10px", borderRadius: 6, border: `1px solid ${C.border}`,
                    background: "transparent", color: sendPage === 0 ? C.borderLight : C.textMuted,
                    cursor: sendPage === 0 ? "not-allowed" : "pointer",
                  }}>
                    <ChevronLeft size={14} />
                  </button>
                  <span style={{
                    padding: "5px 12px", fontSize: 12, color: C.textMuted,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>{sendPage + 1}/{totalPages}</span>
                  <button onClick={() => setSendPage(p => Math.min(totalPages - 1, p + 1))} disabled={sendPage >= totalPages - 1} style={{
                    padding: "5px 10px", borderRadius: 6, border: `1px solid ${C.border}`,
                    background: "transparent", color: sendPage >= totalPages - 1 ? C.borderLight : C.textMuted,
                    cursor: sendPage >= totalPages - 1 ? "not-allowed" : "pointer",
                  }}>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmModal
        open={confirmCancel}
        title="Cancelar campanha"
        message="Tem certeza que deseja cancelar esta campanha? Esta ação não pode ser desfeita."
        confirmLabel="Cancelar Campanha"
        danger
        onConfirm={() => { setConfirmCancel(false); handleAction("failed"); }}
        onCancel={() => setConfirmCancel(false)}
      />
    </div>
  );
}
