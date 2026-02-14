import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Send, Plus, Clock, CheckCircle2, Pause, AlertTriangle, Loader2,
  ChevronRight, ChevronLeft, Globe, Users, Flame, Zap, Calendar,
  X, ArrowRight, Sparkles, Play,
} from "lucide-react";
import { campaignService, domainService, listService, n8nService } from "@/services/api";
import { supabase } from "@/lib/supabase";
import { C } from "@/theme/colors";
import { SkeletonCard } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/contexts/ToastContext";

const statusConfig = {
  draft: { color: C.textDim, bg: "rgba(113,113,122,0.1)", label: "Rascunho", icon: Clock },
  scheduled: { color: C.info, bg: C.infoBg, label: "Agendada", icon: Calendar },
  warming_up: { color: C.warning, bg: C.warningBg, label: "Aquecendo", icon: Flame, pulse: true },
  sending: { color: C.accent, bg: C.accentBg, label: "Enviando", icon: Send, pulse: true },
  paused: { color: C.warning, bg: C.warningBg, label: "Pausada", icon: Pause },
  completed: { color: C.accent, bg: C.accentBg, label: "Concluída", icon: CheckCircle2 },
  failed: { color: C.danger, bg: C.dangerBg, label: "Falhou", icon: AlertTriangle },
};

function StatusBadge({ status }) {
  const s = statusConfig[status] || statusConfig.draft;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 8,
      background: s.bg, color: s.color,
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: "50%", background: s.color,
        animation: s.pulse ? "pulse 2s infinite" : "none",
      }} />
      {s.label}
    </span>
  );
}

// ── Campaign List ──
function CampaignList({ campaigns, loading, onNew, onOpen, onGenerateVariants, generating }) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="cm-page" style={{ padding: "28px 36px", background: C.bg, minHeight: "100vh" }}>
        <div style={{ marginBottom: 28, height: 50 }} />
        <SkeletonCard count={3} />
      </div>
    );
  }

  return (
    <>
      {/* Flow Guide */}
      <div style={{
        background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
        padding: "20px 24px", marginBottom: 20, animation: "fadeIn 0.4s ease-out 0.1s both",
      }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: C.textMuted }}>Fluxo de uma campanha</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {[
            { n: 1, label: "Selecionar domínio + lista" },
            { n: 2, label: "Definir remetente" },
            { n: 3, label: "IA gera 5 variações" },
            { n: 4, label: "Configurar aquecimento" },
            { n: 5, label: "Agendar / Disparar" },
          ].map((step, i) => (
            <div key={step.n} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                width: 24, height: 24, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                background: C.accentBg, color: C.accent, fontSize: 11, fontWeight: 700,
              }}>{step.n}</span>
              <span style={{ fontSize: 12, color: C.textMuted, whiteSpace: "nowrap" }}>{step.label}</span>
              {i < 4 && <ChevronRight size={14} color={C.borderLight} />}
            </div>
          ))}
        </div>
      </div>

      {/* Campaign Cards */}
      {campaigns.length === 0 ? (
        <div style={{
          background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
          padding: "60px 24px", textAlign: "center", animation: "fadeIn 0.4s ease-out 0.2s both",
        }}>
          <Send size={48} color={C.borderLight} style={{ margin: "0 auto 16px" }} />
          <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Nenhuma campanha criada</h3>
          <p style={{ fontSize: 14, color: C.textDim, marginBottom: 20 }}>
            Configure um domínio e importe uma lista antes de criar sua primeira campanha.
          </p>
          <button onClick={onNew} style={{
            padding: "10px 24px", borderRadius: 10, border: "none",
            background: `linear-gradient(135deg, ${C.accent}, ${C.accentDim})`,
            color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
            boxShadow: "0 4px 16px rgba(16,185,129,0.3)",
          }}>
            <Plus size={14} style={{ display: "inline", verticalAlign: -2, marginRight: 6 }} />
            Criar Primeira Campanha
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, animation: "fadeIn 0.4s ease-out 0.2s both" }}>
          {campaigns.map(c => (
            <div key={c.id} style={{
              background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
              padding: "20px 24px", cursor: "pointer", transition: "all 0.15s",
            }}
              onClick={() => navigate(`/campaigns/${c.id}`)}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderLight; e.currentTarget.style.background = C.cardHover; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.card; }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{c.name}</h3>
                  <div style={{ display: "flex", gap: 12, fontSize: 12, color: C.textDim }}>
                    {c.email_domains && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Globe size={12} /> {c.email_domains.domain}
                      </span>
                    )}
                    {c.email_lists && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Users size={12} /> {c.email_lists.name} ({(c.email_lists.valid_contacts || c.email_lists.total_contacts || 0).toLocaleString("pt-BR")})
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <StatusBadge status={c.status} />
                  <ChevronRight size={16} color={C.textDim} />
                </div>
              </div>

              {/* Metrics */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
                {[
                  { label: "Enviados", val: c.total_sent || 0 },
                  { label: "Entregues", val: c.total_delivered || 0 },
                  { label: "Abertos", val: c.total_opened || 0 },
                  { label: "Cliques", val: c.total_clicked || 0 },
                  { label: "Bounces", val: c.total_bounced || 0, warn: true },
                  { label: "Open Rate", val: `${Number(c.open_rate || 0).toFixed(1)}%`, isRate: true },
                ].map(m => (
                  <div key={m.label} style={{
                    padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.02)",
                    border: `1px solid ${C.border}`,
                  }}>
                    <p style={{ fontSize: 10, color: C.textDim, marginBottom: 2 }}>{m.label}</p>
                    <p style={{
                      fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                      color: m.warn && m.val > 0 ? C.warning : m.isRate ? C.accent : C.text,
                    }}>{typeof m.val === "number" ? m.val.toLocaleString("pt-BR") : m.val}</p>
                  </div>
                ))}
              </div>

              {/* Generate Variants Button */}
              {c.status === "draft" && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }} onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => onGenerateVariants(c.id)}
                    disabled={generating === c.id}
                    style={{
                      padding: "8px 18px", borderRadius: 10, border: "none",
                      background: generating === c.id ? C.infoBg : "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                      color: generating === c.id ? C.info : "#fff",
                      fontSize: 13, fontWeight: 600,
                      cursor: generating === c.id ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", gap: 6,
                      boxShadow: generating === c.id ? "none" : "0 4px 16px rgba(139,92,246,0.3)",
                    }}
                  >
                    {generating === c.id
                      ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Gerando variações...</>
                      : <><Sparkles size={14} /> Gerar Variações com IA</>
                    }
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ── New Campaign Wizard ──
function NewCampaignWizard({ onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [domains, setDomains] = useState([]);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    name: "",
    domain_id: "",
    list_id: "",
    from_name: "",
    from_email: "",
    reply_to: "",
    use_warmup: true,
    warmup_start_volume: 50,
    warmup_increment_percent: 30,
    warmup_max_daily: 5000,
    send_between_start: 8,
    send_between_end: 18,
    scheduled_at: "",
  });

  useEffect(() => {
    async function load() {
      try {
        const [d, l] = await Promise.all([domainService.list(), listService.list()]);
        setDomains(d || []);
        setLists(l || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const selectedDomain = domains.find(d => d.id === form.domain_id);

  const handleCreate = async () => {
    setError(null);
    setSaving(true);
    try {
      const selectedList = lists.find(l => l.id === form.list_id);
      await campaignService.create({
        ...form,
        from_email: form.from_email || `noreply@${selectedDomain?.domain || ""}`,
        reply_to: form.reply_to || form.from_email || null,
        total_recipients: selectedList?.valid_contacts || selectedList?.total_contacts || 0,
        scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
        status: form.scheduled_at ? "scheduled" : "draft",
      });
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "10px 14px", borderRadius: 10,
    border: `1px solid ${C.border}`, background: C.bg, color: C.text,
    fontSize: 14, outline: "none", boxSizing: "border-box",
  };

  const labelStyle = {
    display: "block", fontSize: 13, fontWeight: 500, color: C.textMuted, marginBottom: 6,
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0" }}>
        <Loader2 size={28} color={C.accent} style={{ animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{
      background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
      padding: "28px", animation: "fadeIn 0.3s ease-out",
    }}>
      {/* Wizard Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Nova Campanha</h2>
          <p style={{ fontSize: 13, color: C.textDim }}>Passo {step} de 3</p>
        </div>
        <button onClick={onClose} style={{
          background: "none", border: "none", cursor: "pointer", color: C.textDim, padding: 4,
        }}>
          <X size={20} />
        </button>
      </div>

      {/* Step Indicators */}
      <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
        {[
          { n: 1, label: "Domínio & Lista" },
          { n: 2, label: "Remetente" },
          { n: 3, label: "Aquecimento & Agenda" },
        ].map(s => (
          <div key={s.n} style={{
            flex: 1, padding: "10px 14px", borderRadius: 10,
            border: `1px solid ${step === s.n ? C.accent : step > s.n ? "rgba(16,185,129,0.3)" : C.border}`,
            background: step === s.n ? C.accentBg : step > s.n ? "rgba(16,185,129,0.05)" : "transparent",
          }}>
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: step >= s.n ? C.accent : C.textDim,
            }}>Passo {s.n}</span>
            <p style={{ fontSize: 12, color: step >= s.n ? C.text : C.textDim, marginTop: 2 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {error && (
        <div style={{
          background: C.dangerBg, border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10,
          padding: "10px 14px", marginBottom: 20, display: "flex", alignItems: "center", gap: 8,
        }}>
          <AlertTriangle size={14} color={C.danger} />
          <span style={{ fontSize: 13, color: C.danger }}>{error}</span>
        </div>
      )}

      {/* Step 1: Domain & List */}
      {step === 1 && (
        <div>
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Nome da campanha *</label>
            <input
              type="text" value={form.name} onChange={e => set("name", e.target.value)}
              placeholder="Ex: Welcome Series — Previsão.io" style={inputStyle}
              onFocus={e => e.target.style.borderColor = C.accent}
              onBlur={e => e.target.style.borderColor = C.border}
            />
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Domínio de envio *</label>
            {domains.length === 0 ? (
              <p style={{ fontSize: 13, color: C.warning }}>Nenhum domínio cadastrado. Adicione um em Domínios.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {domains.map(d => (
                  <div key={d.id} onClick={() => set("domain_id", d.id)} style={{
                    padding: "12px 16px", borderRadius: 12, cursor: "pointer", transition: "all 0.15s",
                    border: `1px solid ${form.domain_id === d.id ? C.accent : C.border}`,
                    background: form.domain_id === d.id ? C.accentBg : "transparent",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Globe size={16} color={form.domain_id === d.id ? C.accent : C.textDim} />
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{d.domain}</span>
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
                        background: d.health_status === "healthy" ? C.accentBg : d.health_status === "warning" ? C.warningBg : C.dangerBg,
                        color: d.health_status === "healthy" ? C.accent : d.health_status === "warning" ? C.warning : C.danger,
                      }}>Score {d.reputation_score}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Lista de contatos *</label>
            {lists.length === 0 ? (
              <p style={{ fontSize: 13, color: C.warning }}>Nenhuma lista importada. Importe uma em Listas.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {lists.map(l => (
                  <div key={l.id} onClick={() => set("list_id", l.id)} style={{
                    padding: "12px 16px", borderRadius: 12, cursor: "pointer", transition: "all 0.15s",
                    border: `1px solid ${form.list_id === l.id ? C.accent : C.border}`,
                    background: form.list_id === l.id ? C.accentBg : "transparent",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Users size={16} color={form.list_id === l.id ? C.accent : C.textDim} />
                        <div>
                          <span style={{ fontSize: 14, fontWeight: 600 }}>{l.name}</span>
                          <span style={{ fontSize: 12, color: C.textDim, marginLeft: 8 }}>
                            {(l.total_contacts || 0).toLocaleString("pt-BR")} contatos
                          </span>
                        </div>
                      </div>
                      {l.valid_contacts > 0 && (
                        <span style={{ fontSize: 11, color: C.accent, fontFamily: "'JetBrains Mono', monospace" }}>
                          {l.valid_contacts} válidos
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Sender */}
      {step === 2 && (
        <div>
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Nome do remetente *</label>
            <input
              type="text" value={form.from_name} onChange={e => set("from_name", e.target.value)}
              placeholder="Ex: Equipe Previsão.io" style={inputStyle}
              onFocus={e => e.target.style.borderColor = C.accent}
              onBlur={e => e.target.style.borderColor = C.border}
            />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Email remetente *</label>
            <input
              type="email" value={form.from_email} onChange={e => set("from_email", e.target.value)}
              placeholder={`noreply@${selectedDomain?.domain || "seudominio.com"}`} style={inputStyle}
              onFocus={e => e.target.style.borderColor = C.accent}
              onBlur={e => e.target.style.borderColor = C.border}
            />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Reply-to (opcional)</label>
            <input
              type="email" value={form.reply_to} onChange={e => set("reply_to", e.target.value)}
              placeholder="contato@seudominio.com" style={inputStyle}
              onFocus={e => e.target.style.borderColor = C.accent}
              onBlur={e => e.target.style.borderColor = C.border}
            />
          </div>
        </div>
      )}

      {/* Step 3: Warmup & Schedule */}
      {step === 3 && (
        <div>
          {/* Warmup Toggle */}
          <div style={{
            padding: "16px", borderRadius: 12, border: `1px solid ${C.border}`,
            marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Flame size={18} color={form.use_warmup ? C.accent : C.textDim} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 600 }}>Aquecimento automático</p>
                <p style={{ fontSize: 12, color: C.textDim }}>Aumenta volume gradualmente para proteger reputação</p>
              </div>
            </div>
            <button onClick={() => set("use_warmup", !form.use_warmup)} style={{
              width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
              background: form.use_warmup ? C.accent : C.borderLight, transition: "background 0.2s",
              position: "relative",
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: 9, background: "#fff",
                position: "absolute", top: 3,
                left: form.use_warmup ? 23 : 3, transition: "left 0.2s",
              }} />
            </button>
          </div>

          {form.use_warmup && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 20 }}>
              <div>
                <label style={labelStyle}>Volume inicial/dia</label>
                <input type="number" value={form.warmup_start_volume}
                  onChange={e => set("warmup_start_volume", parseInt(e.target.value) || 50)}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = C.accent}
                  onBlur={e => e.target.style.borderColor = C.border}
                />
              </div>
              <div>
                <label style={labelStyle}>Incremento (%/dia)</label>
                <input type="number" value={form.warmup_increment_percent}
                  onChange={e => set("warmup_increment_percent", parseInt(e.target.value) || 30)}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = C.accent}
                  onBlur={e => e.target.style.borderColor = C.border}
                />
              </div>
              <div>
                <label style={labelStyle}>Máximo diário</label>
                <input type="number" value={form.warmup_max_daily}
                  onChange={e => set("warmup_max_daily", parseInt(e.target.value) || 5000)}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = C.accent}
                  onBlur={e => e.target.style.borderColor = C.border}
                />
              </div>
            </div>
          )}

          {/* Send Window */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>Enviar a partir de</label>
              <input type="number" min={0} max={23} value={form.send_between_start}
                onChange={e => set("send_between_start", parseInt(e.target.value) || 8)}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = C.accent}
                onBlur={e => e.target.style.borderColor = C.border}
              />
              <p style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>Horário de São Paulo</p>
            </div>
            <div>
              <label style={labelStyle}>Enviar até</label>
              <input type="number" min={0} max={23} value={form.send_between_end}
                onChange={e => set("send_between_end", parseInt(e.target.value) || 18)}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = C.accent}
                onBlur={e => e.target.style.borderColor = C.border}
              />
            </div>
          </div>

          {/* Schedule */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Agendar para (opcional — deixe vazio para salvar como rascunho)</label>
            <input type="datetime-local" value={form.scheduled_at}
              onChange={e => set("scheduled_at", e.target.value)}
              style={{ ...inputStyle, colorScheme: "dark" }}
              onFocus={e => e.target.style.borderColor = C.accent}
              onBlur={e => e.target.style.borderColor = C.border}
            />
          </div>
        </div>
      )}

      {/* Nav Buttons */}
      <div style={{
        display: "flex", justifyContent: "space-between", paddingTop: 20,
        borderTop: `1px solid ${C.border}`,
      }}>
        <div>
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)} style={{
              padding: "10px 18px", borderRadius: 10, border: `1px solid ${C.border}`,
              background: "transparent", color: C.textMuted, fontSize: 13, fontWeight: 500,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
            }}>
              <ChevronLeft size={14} /> Voltar
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{
            padding: "10px 18px", borderRadius: 10, border: `1px solid ${C.border}`,
            background: "transparent", color: C.textMuted, fontSize: 13, cursor: "pointer",
          }}>
            Cancelar
          </button>
          {step < 3 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={(step === 1 && (!form.name || !form.domain_id || !form.list_id)) || (step === 2 && (!form.from_name || !form.from_email))}
              style={{
                padding: "10px 24px", borderRadius: 10, border: "none",
                background: `linear-gradient(135deg, ${C.accent}, ${C.accentDim})`,
                color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
                opacity: (step === 1 && (!form.name || !form.domain_id || !form.list_id)) || (step === 2 && (!form.from_name || !form.from_email)) ? 0.5 : 1,
              }}
            >
              Próximo <ArrowRight size={14} />
            </button>
          ) : (
            <button onClick={handleCreate} disabled={saving} style={{
              padding: "10px 24px", borderRadius: 10, border: "none",
              background: `linear-gradient(135deg, ${C.accent}, ${C.accentDim})`,
              color: "#fff", fontSize: 13, fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 6,
              opacity: saving ? 0.7 : 1,
              boxShadow: "0 4px 16px rgba(16,185,129,0.3)",
            }}>
              {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Zap size={14} />}
              {form.scheduled_at ? "Agendar Campanha" : "Criar Campanha"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──
export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [generating, setGenerating] = useState(null);
  const toast = useToast();

  const loadCampaigns = async () => {
    try {
      const data = await campaignService.list();
      setCampaigns(data || []);
    } catch (err) {
      console.error("Error loading campaigns:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCampaigns(); }, []);

  // Realtime: refresh campaigns on status/metric updates and new variants
  useEffect(() => {
    const channel = supabase
      .channel("campaigns-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "email_campaigns" }, () => loadCampaigns())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "email_variants" }, () => loadCampaigns())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleGenerateVariants = async (campaignId) => {
    setGenerating(campaignId);
    try {
      await n8nService.triggerGenerateVariants(campaignId);
      await loadCampaigns();
    } catch (err) {
      toast.error("Erro ao gerar variações: " + err.message);
    } finally {
      setGenerating(null);
    }
  };

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
            Campanhas
          </h1>
          <p style={{ fontSize: 14, color: C.textDim }}>
            Crie e gerencie seus disparos de email
          </p>
        </div>
        {!showWizard && (
          <button onClick={() => setShowWizard(true)} style={{
            padding: "8px 20px", borderRadius: 10, border: "none",
            background: `linear-gradient(135deg, ${C.accent}, ${C.accentDim})`,
            color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
            boxShadow: "0 4px 16px rgba(16,185,129,0.3)",
          }}>
            <Plus size={16} /> Nova Campanha
          </button>
        )}
      </div>

      {showWizard ? (
        <NewCampaignWizard
          onClose={() => setShowWizard(false)}
          onCreated={() => { setShowWizard(false); loadCampaigns(); }}
        />
      ) : (
        <CampaignList
          campaigns={campaigns}
          loading={loading}
          onNew={() => setShowWizard(true)}
          onOpen={(c) => {}}
          onGenerateVariants={handleGenerateVariants}
          generating={generating}
        />
      )}
    </div>
  );
}
