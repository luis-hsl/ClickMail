import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from "recharts";
import {
  Flame, Loader2, AlertTriangle, CheckCircle2, Clock, Pause, Play,
  SkipForward, Settings, ChevronRight, Send, XCircle, Calendar,
  ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { campaignService } from "@/services/api";
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
          {p.name}: {p.value.toLocaleString("pt-BR")}
        </p>
      ))}
    </div>
  );
}

async function fetchActiveWarmups() {
  const { data, error } = await supabase
    .from("email_campaigns")
    .select(`
      id, name, status, use_warmup, total_sent, total_delivered, total_bounced, total_complained,
      warmup_start_volume, warmup_increment_percent, warmup_max_daily, total_recipients,
      email_domains(domain, reputation_score),
      warmup_schedule(*)
    `)
    .in("status", ["warming_up", "sending", "paused", "scheduled", "draft"])
    .eq("use_warmup", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export default function Warmup() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [newVolume, setNewVolume] = useState("");
  const navigate = useNavigate();

  const load = async () => {
    try {
      const data = await fetchActiveWarmups();
      setCampaigns(data);
      if (data.length > 0 && !selected) setSelected(data[0]);
      else if (selected) {
        const updated = data.find(c => c.id === selected.id);
        if (updated) setSelected(updated);
      }
    } catch (err) {
      console.error("Error loading warmups:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Realtime: subscribe to warmup schedule and campaign updates
  useEffect(() => {
    const channel = supabase
      .channel("warmup-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "warmup_schedule" }, () => load())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "email_campaigns" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const schedule = (selected?.warmup_schedule || []).sort((a, b) => a.day_number - b.day_number);
  const today = new Date().toISOString().split("T")[0];
  const todaySchedule = schedule.find(s => s.scheduled_date === today);
  const completedDays = schedule.filter(s => s.status === "completed").length;
  const currentDay = todaySchedule?.day_number || completedDays + 1;

  const chartData = schedule.map(s => ({
    dia: `D${s.day_number}`,
    planejado: s.planned_volume,
    enviado: s.actual_sent || 0,
    date: s.scheduled_date,
  }));

  const healthData = schedule
    .filter(s => s.status === "completed" && s.actual_sent > 0)
    .map(s => ({
      dia: `D${s.day_number}`,
      bounceRate: s.actual_sent > 0 ? ((s.bounced || 0) / s.actual_sent * 100) : 0,
      complaintRate: s.actual_sent > 0 ? ((s.complained || 0) / s.actual_sent * 100) : 0,
    }));

  const totalPlanned = schedule.reduce((s, d) => s + d.planned_volume, 0);
  const totalActual = schedule.reduce((s, d) => s + (d.actual_sent || 0), 0);
  const avgBounce = selected && selected.total_sent > 0
    ? ((selected.total_bounced || 0) / selected.total_sent * 100) : 0;
  const avgComplaint = selected && selected.total_sent > 0
    ? ((selected.total_complained || 0) / selected.total_sent * 100) : 0;

  const handlePause = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      await campaignService.update(selected.id, {
        status: selected.status === "paused" ? "warming_up" : "paused",
      });
      await load();
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };

  const handleSkipDay = async () => {
    if (!todaySchedule) return;
    setActionLoading(true);
    try {
      await supabase.from("warmup_schedule")
        .update({ status: "skipped" })
        .eq("id", todaySchedule.id);
      await load();
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };

  const handleAdjustVolume = async () => {
    if (!todaySchedule || !newVolume) return;
    setActionLoading(true);
    try {
      await supabase.from("warmup_schedule")
        .update({ planned_volume: parseInt(newVolume) })
        .eq("id", todaySchedule.id);
      setAdjusting(false);
      setNewVolume("");
      await load();
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };

  if (loading) {
    return (
      <div className="cm-page" style={{ padding: "28px 36px", background: C.bg, minHeight: "100vh" }}>
        <div style={{ marginBottom: 28, height: 50 }} />
        <SkeletonCard count={5} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 24 }}>
          <SkeletonChart height={280} />
          <SkeletonChart height={280} />
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
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.5 } }
        ::placeholder { color: ${C.textDim}; }
      `}</style>

      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        marginBottom: 28, animation: "fadeIn 0.4s ease-out",
      }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>
            Aquecimento
          </h1>
          <p style={{ fontSize: 14, color: C.textDim }}>
            Monitore e controle o aquecimento dos seus domínios
          </p>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <div style={{
          background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
          animation: "fadeIn 0.4s ease-out 0.1s both",
        }}>
          <EmptyState
            icon="flame"
            title="Nenhum aquecimento ativo"
            description="Crie uma campanha com aquecimento ativado para começar."
            action={{ label: "Ir para Campanhas", onClick: () => navigate("/campaigns") }}
          />
        </div>
      ) : (
        <>
          {/* Campaign Selector */}
          {campaigns.length > 1 && (
            <div style={{
              display: "flex", gap: 8, marginBottom: 20, animation: "fadeIn 0.4s ease-out 0.05s both",
            }}>
              {campaigns.map(c => (
                <button key={c.id} onClick={() => setSelected(c)} style={{
                  padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer",
                  border: `1px solid ${selected?.id === c.id ? C.accent : C.border}`,
                  background: selected?.id === c.id ? C.accentBg : "transparent",
                  color: selected?.id === c.id ? C.accent : C.textDim,
                  transition: "all 0.15s",
                }}>
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {selected && (
            <>
              {/* Overview Cards */}
              <div className="cm-grid-5" style={{
                display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 24,
                animation: "fadeIn 0.5s ease-out 0.1s both",
              }}>
                {[
                  { label: "Dia Atual", value: `${currentDay}/${schedule.length}`, icon: Calendar, color: C.accent },
                  { label: "Volume Hoje", value: todaySchedule ? `${todaySchedule.actual_sent || 0}/${todaySchedule.planned_volume}` : "—", icon: Send, color: C.info },
                  { label: "Total Enviado", value: totalActual.toLocaleString("pt-BR"), icon: CheckCircle2, color: C.accent },
                  { label: "Bounce Rate", value: `${avgBounce.toFixed(2)}%`, icon: AlertTriangle, color: avgBounce > 5 ? C.danger : avgBounce > 2 ? C.warning : C.accent },
                  { label: "Complaint Rate", value: `${avgComplaint.toFixed(2)}%`, icon: XCircle, color: avgComplaint > 0.1 ? C.danger : C.accent },
                ].map(m => (
                  <div key={m.label} style={{
                    background: C.card, borderRadius: 14, padding: "16px 18px",
                    border: `1px solid ${C.border}`,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                      <m.icon size={15} color={m.color} />
                      <span style={{ fontSize: 11, color: C.textDim, fontWeight: 500 }}>{m.label}</span>
                    </div>
                    <p style={{
                      fontSize: 22, fontWeight: 700, color: m.color,
                      fontFamily: "'JetBrains Mono', monospace", lineHeight: 1,
                    }}>{m.value}</p>
                  </div>
                ))}
              </div>

              {/* Controls */}
              <div style={{
                display: "flex", gap: 10, marginBottom: 24,
                animation: "fadeIn 0.5s ease-out 0.15s both",
              }}>
                <button onClick={handlePause} disabled={actionLoading} style={{
                  padding: "9px 18px", borderRadius: 10, border: `1px solid ${C.border}`,
                  background: C.card, fontSize: 13, fontWeight: 500, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                  color: selected.status === "paused" ? C.accent : C.warning,
                }}>
                  {selected.status === "paused" ? <Play size={14} /> : <Pause size={14} />}
                  {selected.status === "paused" ? "Retomar" : "Pausar"} Aquecimento
                </button>

                {todaySchedule && todaySchedule.status !== "skipped" && todaySchedule.status !== "completed" && (
                  <button onClick={handleSkipDay} disabled={actionLoading} style={{
                    padding: "9px 18px", borderRadius: 10, border: `1px solid ${C.border}`,
                    background: C.card, color: C.textMuted, fontSize: 13, fontWeight: 500,
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <SkipForward size={14} /> Pular Hoje
                  </button>
                )}

                {!adjusting ? (
                  <button onClick={() => { setAdjusting(true); setNewVolume(String(todaySchedule?.planned_volume || "")); }}
                    disabled={!todaySchedule} style={{
                    padding: "9px 18px", borderRadius: 10, border: `1px solid ${C.border}`,
                    background: C.card, color: C.textMuted, fontSize: 13, fontWeight: 500,
                    cursor: todaySchedule ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: 6,
                    opacity: todaySchedule ? 1 : 0.5,
                  }}>
                    <Settings size={14} /> Ajustar Volume
                  </button>
                ) : (
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input type="number" value={newVolume} onChange={e => setNewVolume(e.target.value)}
                      placeholder="Novo volume" style={{
                      width: 120, padding: "8px 12px", borderRadius: 8,
                      border: `1px solid ${C.border}`, background: C.bg, color: C.text,
                      fontSize: 13, outline: "none",
                    }} />
                    <button onClick={handleAdjustVolume} disabled={actionLoading || !newVolume} style={{
                      padding: "8px 14px", borderRadius: 8, border: "none",
                      background: C.accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    }}>Salvar</button>
                    <button onClick={() => setAdjusting(false)} style={{
                      padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`,
                      background: "transparent", color: C.textDim, fontSize: 12, cursor: "pointer",
                    }}>Cancelar</button>
                  </div>
                )}
              </div>

              {/* Charts Row */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24,
                animation: "fadeIn 0.5s ease-out 0.2s both",
              }}>
                {/* Volume Chart */}
                <div style={{
                  background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: "20px 24px",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 700 }}>Volume Planejado vs Real</h3>
                      <p style={{ fontSize: 12, color: C.textDim, marginTop: 2 }}>
                        {totalActual.toLocaleString("pt-BR")} de {totalPlanned.toLocaleString("pt-BR")} emails
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 12 }}>
                      {[{ label: "Planejado", color: C.borderLight }, { label: "Enviado", color: C.accent }].map(l => (
                        <span key={l.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.textMuted }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
                          {l.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                      <XAxis dataKey="dia" stroke={C.textDim} fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke={C.textDim} fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="planejado" name="Planejado" fill={C.borderLight} radius={[3, 3, 0, 0]} maxBarSize={16} />
                      <Bar dataKey="enviado" name="Enviado" fill={C.accent} radius={[3, 3, 0, 0]} maxBarSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Health Chart */}
                <div style={{
                  background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: "20px 24px",
                }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Saúde do Aquecimento</h3>
                  <p style={{ fontSize: 12, color: C.textDim, marginBottom: 16 }}>Bounce rate e complaint rate diários</p>
                  {healthData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={healthData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                        <XAxis dataKey="dia" stroke={C.textDim} fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke={C.textDim} fontSize={10} tickLine={false} axisLine={false} unit="%" />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="bounceRate" name="Bounce %" stroke={C.warning} strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="complaintRate" name="Complaint %" stroke={C.danger} strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 220, color: C.textDim, fontSize: 13 }}>
                      Dados disponíveis após os primeiros envios
                    </div>
                  )}
                </div>
              </div>

              {/* Timeline */}
              <div style={{
                background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
                padding: "20px 24px", animation: "fadeIn 0.5s ease-out 0.3s both",
              }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Cronograma de Aquecimento</h3>
                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
                  gap: 8,
                }}>
                  {schedule.map(s => {
                    const isToday = s.scheduled_date === today;
                    const pct = s.planned_volume > 0 ? Math.min(100, ((s.actual_sent || 0) / s.planned_volume) * 100) : 0;
                    let bg = "transparent";
                    let borderColor = C.border;
                    let textColor = C.textDim;

                    if (s.status === "completed") {
                      bg = C.accentBg;
                      borderColor = "rgba(16,185,129,0.3)";
                      textColor = C.accent;
                    } else if (s.status === "in_progress" || isToday) {
                      bg = C.infoBg;
                      borderColor = "rgba(59,130,246,0.3)";
                      textColor = C.info;
                    } else if (s.status === "skipped") {
                      bg = C.warningBg;
                      borderColor = "rgba(245,158,11,0.2)";
                      textColor = C.warning;
                    }

                    return (
                      <div key={s.id} style={{
                        padding: "10px", borderRadius: 10, border: `1px solid ${borderColor}`,
                        background: bg, textAlign: "center", position: "relative", overflow: "hidden",
                      }}>
                        {isToday && (
                          <div style={{
                            position: "absolute", top: 0, left: 0, right: 0, height: 2,
                            background: C.info, animation: "pulse 2s infinite",
                          }} />
                        )}
                        <p style={{
                          fontSize: 11, fontWeight: 700, color: textColor, marginBottom: 2,
                        }}>Dia {s.day_number}</p>
                        <p style={{
                          fontSize: 14, fontWeight: 700, color: textColor,
                          fontFamily: "'JetBrains Mono', monospace",
                        }}>{s.planned_volume}</p>
                        <p style={{ fontSize: 9, color: C.textDim, marginTop: 2 }}>
                          {new Date(s.scheduled_date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                        </p>
                        {s.status === "completed" && (
                          <CheckCircle2 size={10} color={C.accent} style={{ marginTop: 2 }} />
                        )}
                        {s.status === "skipped" && (
                          <SkipForward size={10} color={C.warning} style={{ marginTop: 2 }} />
                        )}
                        {(s.status === "in_progress" || isToday) && s.status !== "completed" && s.status !== "skipped" && (
                          <div style={{
                            marginTop: 4, height: 3, borderRadius: 2,
                            background: "rgba(59,130,246,0.2)",
                          }}>
                            <div style={{
                              width: `${pct}%`, height: "100%", borderRadius: 2, background: C.info,
                              transition: "width 0.6s",
                            }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {schedule.length === 0 && (
                  <div style={{ padding: "32px 0", textAlign: "center", color: C.textDim, fontSize: 13 }}>
                    Nenhum cronograma gerado para esta campanha.
                    <br />
                    <span style={{ fontSize: 12 }}>Inicie a campanha para gerar o warmup schedule automaticamente.</span>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
