import { useState, useEffect } from "react";
import {
  Globe, Plus, CheckCircle2, XCircle, Shield, RefreshCw, Trash2,
  Activity, Send, AlertTriangle, Loader2, X, Copy, Check, ChevronDown, ChevronUp,
} from "lucide-react";
import { domainService, edgeFunctionService } from "@/services/api";
import { supabase } from "@/lib/supabase";
import { C } from "@/theme/colors";
import { SkeletonTable } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useToast } from "@/contexts/ToastContext";

const healthColors = {
  healthy: { color: C.accent, bg: C.accentBg, label: "Saudável" },
  warning: { color: C.warning, bg: C.warningBg, label: "Atenção" },
  critical: { color: C.danger, bg: C.dangerBg, label: "Crítico" },
};

const sesStatusMap = {
  verified: { color: C.accent, bg: C.accentBg, label: "SES Verificado" },
  pending: { color: C.warning, bg: C.warningBg, label: "SES Pendente" },
  none: { color: C.textDim, bg: "rgba(255,255,255,0.04)", label: "SES Não Registrado" },
};

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback */ }
  };
  return (
    <button onClick={handleCopy} title="Copiar" style={{
      background: "none", border: "none", cursor: "pointer", padding: 4,
      color: copied ? C.accent : C.textDim, transition: "color 0.2s",
      flexShrink: 0,
    }}>
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

function DnsRecordRow({ type, name, value, purpose }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "60px 1fr 1fr 32px", gap: 8, alignItems: "center",
      padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`,
      background: "rgba(255,255,255,0.01)", fontSize: 12,
    }}>
      <span style={{
        fontWeight: 700, color: C.info, fontSize: 11, padding: "2px 6px",
        borderRadius: 4, background: C.infoBg, textAlign: "center",
      }}>{type}</span>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.textMuted,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }} title={name}>{name}</span>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.text,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }} title={value}>{value}</span>
      <CopyButton text={value} />
    </div>
  );
}

function DnsRecordsPanel({ domain, tokens, region = "sa-east-1" }) {
  const [open, setOpen] = useState(true);
  if (!tokens || tokens.length === 0) return null;

  const records = [
    ...tokens.map(t => ({
      type: "CNAME", name: `${t}._domainkey.${domain}`,
      value: `${t}.dkim.amazonses.com`, purpose: "DKIM",
    })),
    { type: "TXT", name: domain, value: "v=spf1 include:amazonses.com ~all", purpose: "SPF" },
    { type: "TXT", name: `_dmarc.${domain}`, value: `v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}`, purpose: "DMARC" },
    { type: "MX", name: `send.${domain}`, value: `10 feedback-smtp.${region}.amazonses.com`, purpose: "MAIL FROM" },
    { type: "TXT", name: `send.${domain}`, value: "v=spf1 include:amazonses.com ~all", purpose: "MAIL FROM SPF" },
  ];

  return (
    <div style={{
      marginTop: 16, borderRadius: 12, border: `1px solid ${C.border}`,
      background: "rgba(255,255,255,0.01)", overflow: "hidden",
    }}>
      <button onClick={() => setOpen(!open)} style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", background: "none", border: "none", cursor: "pointer", color: C.text,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Shield size={15} color={C.info} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>Registros DNS para configurar</span>
          <span style={{
            fontSize: 11, color: C.textDim, background: "rgba(255,255,255,0.04)",
            padding: "2px 8px", borderRadius: 10,
          }}>{records.length} registros</span>
        </div>
        {open ? <ChevronUp size={16} color={C.textDim} /> : <ChevronDown size={16} color={C.textDim} />}
      </button>
      {open && (
        <div style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
          {/* Header */}
          <div style={{
            display: "grid", gridTemplateColumns: "60px 1fr 1fr 32px", gap: 8,
            padding: "4px 12px", fontSize: 10, color: C.textDim, fontWeight: 600,
            textTransform: "uppercase", letterSpacing: "0.05em",
          }}>
            <span>Tipo</span><span>Nome</span><span>Valor</span><span />
          </div>
          {records.map((r, i) => (
            <DnsRecordRow key={i} {...r} />
          ))}
          <p style={{ fontSize: 11, color: C.textDim, padding: "4px 12px", lineHeight: 1.5 }}>
            Configure estes registros no DNS do seu domínio. A propagação pode levar até 72h.
            Após configurar, clique em <strong style={{ color: C.info }}>"Verificar DNS"</strong> para validar.
          </p>
        </div>
      )}
    </div>
  );
}

function DnsCheck({ label, configured, record }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
      borderRadius: 10, border: `1px solid ${C.border}`, background: "rgba(255,255,255,0.01)",
    }}>
      {configured
        ? <CheckCircle2 size={16} color={C.accent} />
        : <XCircle size={16} color={C.danger} />
      }
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{label}</span>
        {record && (
          <p style={{
            fontSize: 11, color: C.textDim, marginTop: 2,
            fontFamily: "'JetBrains Mono', monospace",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 320,
          }}>{record}</p>
        )}
      </div>
      <span style={{
        fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6,
        background: configured ? C.accentBg : C.dangerBg,
        color: configured ? C.accent : C.danger,
      }}>
        {configured ? "Verificado" : "Pendente"}
      </span>
    </div>
  );
}

export default function Domains() {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);
  const [sendCounts, setSendCounts] = useState({});
  const [verifying, setVerifying] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const toast = useToast();

  const loadDomains = async () => {
    try {
      const data = await domainService.list();
      setDomains(data || []);

      // Fetch sends last 24h per domain
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: sends } = await supabase
        .from("email_sends")
        .select("campaign_id, email_campaigns(domain_id)")
        .gte("sent_at", since);

      const counts = {};
      (sends || []).forEach(s => {
        const did = s.email_campaigns?.domain_id;
        if (did) counts[did] = (counts[did] || 0) + 1;
      });
      setSendCounts(counts);
    } catch (err) {
      console.error("Error loading domains:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDomains(); }, []);

  // Realtime: subscribe to domain updates (DNS verify, reputation)
  useEffect(() => {
    const channel = supabase
      .channel("domains-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "email_domains" }, () => {
        loadDomains();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError(null);
    const cleaned = newDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!cleaned || !cleaned.includes(".")) {
      setError("Insira um domínio válido (ex: previsao.io)");
      return;
    }
    setAdding(true);
    try {
      // 1. Create domain in DB
      const created = await domainService.create(cleaned);
      // 2. Register in AWS SES + get DKIM tokens
      try {
        const sesResult = await edgeFunctionService.manageSesIdentity("create", cleaned, created.id);
        if (sesResult?.dns_records) {
          toast.success("Domínio registrado no SES! Configure os registros DNS abaixo.");
        }
      } catch (sesErr) {
        toast.error("Domínio criado, mas erro ao registrar no SES: " + (sesErr.message || "Erro desconhecido"));
      }
      setNewDomain("");
      setShowAdd(false);
      await loadDomains();
    } catch (err) {
      setError(err.message?.includes("duplicate") ? "Este domínio já foi adicionado" : err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleVerifyDns = async (domain) => {
    setVerifying(domain.id);
    try {
      await edgeFunctionService.verifyDns(domain.domain, domain.id);
      await loadDomains();
      toast.success("DNS e SES verificados com sucesso");
    } catch (err) {
      toast.error("Erro ao verificar: " + err.message);
    } finally {
      setVerifying(null);
    }
  };

  const handleCalculateReputation = async (domainId) => {
    setVerifying(domainId);
    try {
      await edgeFunctionService.calculateReputation(domainId);
      await loadDomains();
      toast.success("Reputação recalculada");
    } catch (err) {
      toast.error("Erro ao calcular reputação: " + err.message);
    } finally {
      setVerifying(null);
    }
  };

  const handleRegisterSes = async (d) => {
    setVerifying(d.id);
    try {
      await edgeFunctionService.manageSesIdentity("create", d.domain, d.id);
      await loadDomains();
      toast.success("Domínio registrado no SES! Configure os registros DNS.");
    } catch (err) {
      toast.error("Erro ao registrar no SES: " + err.message);
    } finally {
      setVerifying(null);
    }
  };

  const handleDelete = async (id, domain) => {
    setConfirmDelete({ id, domain });
  };

  const confirmDeleteDomain = async () => {
    if (!confirmDelete) return;
    try {
      // Remove from SES first
      try {
        await edgeFunctionService.manageSesIdentity("delete", confirmDelete.domain, confirmDelete.id);
      } catch { /* continue even if SES delete fails */ }
      await supabase.from("email_domains").delete().eq("id", confirmDelete.id);
      await loadDomains();
      toast.success("Domínio removido do app e do SES");
    } catch (err) {
      toast.error("Erro ao remover domínio");
    } finally {
      setConfirmDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="cm-page" style={{ padding: "28px 36px", background: C.bg, minHeight: "100vh" }}>
        <div style={{ marginBottom: 28, height: 50 }} />
        <SkeletonTable rows={3} cols={4} />
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
        ::placeholder { color: ${C.textDim}; }
      `}</style>

      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        marginBottom: 28, animation: "fadeIn 0.4s ease-out",
      }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>
            Domínios
          </h1>
          <p style={{ fontSize: 14, color: C.textDim }}>
            Gerencie a autenticação DNS e verificação SES dos seus domínios
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{
            padding: "8px 20px", borderRadius: 10, border: "none",
            background: `linear-gradient(135deg, ${C.accent}, ${C.accentDim})`,
            color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
            boxShadow: "0 4px 16px rgba(16,185,129,0.3)",
          }}
        >
          <Plus size={16} /> Adicionar Domínio
        </button>
      </div>

      {/* Add Domain Modal */}
      {showAdd && (
        <div style={{
          background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
          padding: "24px", marginBottom: 20, animation: "fadeIn 0.3s ease-out",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Novo Domínio</h3>
            <button onClick={() => { setShowAdd(false); setError(null); }} style={{
              background: "none", border: "none", cursor: "pointer", color: C.textDim, padding: 4,
            }}>
              <X size={18} />
            </button>
          </div>

          <p style={{ fontSize: 13, color: C.textDim, marginBottom: 16, lineHeight: 1.5 }}>
            O domínio será automaticamente registrado no Amazon SES. Após adicionar, você receberá os registros DNS para configurar.
          </p>

          {error && (
            <div style={{
              background: C.dangerBg, border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10,
              padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8,
            }}>
              <AlertTriangle size={14} color={C.danger} />
              <span style={{ fontSize: 13, color: C.danger }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleAdd} style={{ display: "flex", gap: 10 }}>
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="ex: empresa.com.br"
              style={{
                flex: 1, padding: "10px 14px", borderRadius: 10,
                border: `1px solid ${C.border}`, background: C.bg, color: C.text,
                fontSize: 14, outline: "none", transition: "border-color 0.2s",
              }}
              onFocus={(e) => e.target.style.borderColor = C.accent}
              onBlur={(e) => e.target.style.borderColor = C.border}
            />
            <button type="submit" disabled={adding} style={{
              padding: "10px 24px", borderRadius: 10, border: "none",
              background: `linear-gradient(135deg, ${C.accent}, ${C.accentDim})`,
              color: "#fff", fontSize: 13, fontWeight: 600, cursor: adding ? "not-allowed" : "pointer",
              opacity: adding ? 0.7 : 1, display: "flex", alignItems: "center", gap: 6,
            }}>
              {adding && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
              Adicionar
            </button>
            <button type="button" onClick={() => { setShowAdd(false); setError(null); }} style={{
              padding: "10px 16px", borderRadius: 10, border: `1px solid ${C.border}`,
              background: "transparent", color: C.textMuted, fontSize: 13, cursor: "pointer",
            }}>
              Cancelar
            </button>
          </form>
        </div>
      )}

      {/* Domain List */}
      {domains.length === 0 ? (
        <div style={{
          background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
          animation: "fadeIn 0.4s ease-out 0.2s both",
        }}>
          <EmptyState
            icon="globe"
            title="Nenhum domínio configurado"
            description="Adicione seu primeiro domínio para configurar automaticamente no Amazon SES."
            action={{ label: "Adicionar Domínio", icon: Plus, onClick: () => setShowAdd(true) }}
          />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeIn 0.4s ease-out 0.2s both" }}>
          {domains.map(d => {
            const health = healthColors[d.health_status] || healthColors.critical;
            const dnsOk = [d.spf_configured, d.dkim_configured, d.dmarc_configured].filter(Boolean).length;
            const hasTokens = d.ses_dkim_tokens && d.ses_dkim_tokens.length > 0;
            const sesStatus = d.ses_verified ? "verified" : hasTokens ? "pending" : "none";
            const ses = sesStatusMap[sesStatus];
            return (
              <div key={d.id} style={{
                background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
                padding: "24px", transition: "border-color 0.2s",
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = C.borderLight}
                onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
              >
                {/* Domain Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 12, background: C.accentBg,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Globe size={20} color={C.accent} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: 17, fontWeight: 700 }}>{d.domain}</h3>
                      <p style={{ fontSize: 12, color: C.textDim }}>
                        Adicionado em {new Date(d.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 8,
                      background: ses.bg, color: ses.color,
                    }}>
                      {ses.label}
                    </span>
                    <span style={{
                      fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 8,
                      background: health.bg, color: health.color,
                    }}>
                      {health.label}
                    </span>
                    <button onClick={() => handleDelete(d.id, d.domain)} style={{
                      background: "none", border: `1px solid ${C.border}`, borderRadius: 8,
                      padding: "6px 8px", cursor: "pointer", color: C.textDim, transition: "all 0.15s",
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)"; e.currentTarget.style.color = C.danger; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textDim; }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                  {!hasTokens && (
                    <button
                      onClick={() => handleRegisterSes(d)}
                      disabled={verifying === d.id}
                      style={{
                        padding: "7px 16px", borderRadius: 8, border: `1px solid ${C.border}`,
                        background: "transparent", color: C.warning, fontSize: 12, fontWeight: 600,
                        cursor: verifying === d.id ? "not-allowed" : "pointer",
                        display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s",
                      }}
                      onMouseEnter={e => { if (verifying !== d.id) { e.currentTarget.style.borderColor = C.warning; e.currentTarget.style.background = C.warningBg; } }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = "transparent"; }}
                    >
                      {verifying === d.id
                        ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
                        : <Shield size={13} />
                      }
                      Registrar no SES
                    </button>
                  )}
                  <button
                    onClick={() => handleVerifyDns(d)}
                    disabled={verifying === d.id}
                    style={{
                      padding: "7px 16px", borderRadius: 8, border: `1px solid ${C.border}`,
                      background: "transparent", color: C.info, fontSize: 12, fontWeight: 600,
                      cursor: verifying === d.id ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { if (verifying !== d.id) { e.currentTarget.style.borderColor = C.info; e.currentTarget.style.background = C.infoBg; } }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = "transparent"; }}
                  >
                    {verifying === d.id
                      ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
                      : <RefreshCw size={13} />
                    }
                    Verificar DNS
                  </button>
                  <button
                    onClick={() => handleCalculateReputation(d.id)}
                    disabled={verifying === d.id}
                    style={{
                      padding: "7px 16px", borderRadius: 8, border: `1px solid ${C.border}`,
                      background: "transparent", color: C.accent, fontSize: 12, fontWeight: 600,
                      cursor: verifying === d.id ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { if (verifying !== d.id) { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.background = C.accentBg; } }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = "transparent"; }}
                  >
                    <Activity size={13} />
                    Calcular Reputação
                  </button>
                </div>

                {/* Metrics Row */}
                <div className="cm-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
                  {[
                    { label: "Reputação", value: `${d.reputation_score}/100`, icon: Activity, color: d.reputation_score >= 70 ? C.accent : d.reputation_score >= 40 ? C.warning : C.danger },
                    { label: "DNS Verificados", value: `${dnsOk}/3`, icon: Shield, color: dnsOk === 3 ? C.accent : dnsOk >= 1 ? C.warning : C.danger },
                    { label: "Enviados (24h)", value: (sendCounts[d.id] || 0).toLocaleString("pt-BR"), icon: Send, color: C.info },
                    { label: "Bounce Rate", value: `${Number(d.bounce_rate || 0).toFixed(1)}%`, icon: AlertTriangle, color: Number(d.bounce_rate || 0) > 5 ? C.danger : C.accent },
                  ].map(m => (
                    <div key={m.label} style={{
                      padding: "12px 14px", borderRadius: 10, border: `1px solid ${C.border}`,
                      background: "rgba(255,255,255,0.01)",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                        <m.icon size={14} color={m.color} />
                        <span style={{ fontSize: 11, color: C.textDim }}>{m.label}</span>
                      </div>
                      <span style={{
                        fontSize: 18, fontWeight: 700, color: m.color,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>{m.value}</span>
                    </div>
                  ))}
                </div>

                {/* DNS Checks */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <DnsCheck label="SPF" configured={d.spf_configured} record={d.spf_record} />
                  <DnsCheck label="DKIM" configured={d.dkim_configured} record={d.dkim_selector ? `Selector: ${d.dkim_selector}` : null} />
                  <DnsCheck label="DMARC" configured={d.dmarc_configured} record={d.dmarc_policy} />
                </div>

                {/* DNS Records to configure */}
                <DnsRecordsPanel domain={d.domain} tokens={d.ses_dkim_tokens} />
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        open={!!confirmDelete}
        title="Remover domínio"
        message={`Tem certeza que deseja remover ${confirmDelete?.domain}? O domínio será removido do app e do Amazon SES.`}
        confirmLabel="Remover"
        danger
        onConfirm={confirmDeleteDomain}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
