import { useState, useEffect } from "react";
import {
  Cloud, Key, Bot, Server, Save, CheckCircle2, XCircle, Loader2,
  AlertTriangle, Eye, EyeOff, Bell, BellOff, Shield, Wifi,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { C } from "@/theme/colors";
import { SkeletonChart } from "@/components/ui/Skeleton";

const integrations = [
  {
    id: "ses",
    name: "Amazon SES",
    description: "Serviço de disparo de emails via AWS",
    icon: Cloud,
    color: C.warning,
    fields: [
      { key: "AWS_ACCESS_KEY_ID", label: "Access Key ID", secret: true },
      { key: "AWS_SECRET_ACCESS_KEY", label: "Secret Access Key", secret: true },
      { key: "AWS_REGION", label: "Região", secret: false, placeholder: "sa-east-1" },
    ],
  },
  {
    id: "millionverifier",
    name: "MillionVerifier",
    description: "Verificação e validação de emails",
    icon: Shield,
    color: C.info,
    fields: [
      { key: "MILLIONVERIFIER_API_KEY", label: "API Key", secret: true },
    ],
  },
  {
    id: "gemini",
    name: "Gemini AI",
    description: "Geração de variações de email com IA",
    icon: Bot,
    color: C.accent,
    fields: [
      { key: "GEMINI_API_KEY", label: "API Key", secret: true },
    ],
  },
  {
    id: "n8n",
    name: "n8n",
    description: "Automação de workflows",
    icon: Server,
    color: "#ff6d5a",
    fields: [
      { key: "N8N_WEBHOOK_BASE_URL", label: "Webhook Base URL", secret: false, placeholder: "https://n8n.seudominio.com/webhook" },
    ],
  },
];

const notificationKeys = [
  { key: "NOTIFY_CAMPAIGN_COMPLETE", label: "Campanha concluída" },
  { key: "NOTIFY_HIGH_BOUNCE", label: "Bounce rate alto (>5%)" },
  { key: "NOTIFY_WARMUP_DAILY", label: "Resumo diário de aquecimento" },
  { key: "NOTIFY_VERIFICATION_DONE", label: "Verificação de lista concluída" },
];

async function loadSettings() {
  const { data, error } = await supabase
    .from("app_settings")
    .select("key, value, is_secret");
  if (error) throw error;
  const map = {};
  (data || []).forEach(s => { map[s.key] = s.value || ""; });
  return map;
}

async function saveSetting(key, value, isSecret = false) {
  const { error } = await supabase
    .from("app_settings")
    .upsert({
      key,
      value,
      is_secret: isSecret,
      updated_at: new Date().toISOString(),
    }, { onConflict: "key" });
  if (error) throw error;
}

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [saved, setSaved] = useState({});
  const [errors, setErrors] = useState({});
  const [showSecrets, setShowSecrets] = useState({});

  useEffect(() => {
    loadSettings()
      .then(setSettings)
      .catch(err => console.error("Error loading settings:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key, value) => {
    setSettings(s => ({ ...s, [key]: value }));
    setSaved(s => ({ ...s, [key]: false }));
  };

  const handleSaveIntegration = async (integration) => {
    const id = integration.id;
    setSaving(s => ({ ...s, [id]: true }));
    setErrors(s => ({ ...s, [id]: null }));
    try {
      for (const field of integration.fields) {
        const val = settings[field.key] || "";
        await saveSetting(field.key, val, field.secret);
      }
      setSaved(s => ({ ...s, [id]: true }));
      setTimeout(() => setSaved(s => ({ ...s, [id]: false })), 3000);
    } catch (err) {
      setErrors(s => ({ ...s, [id]: err.message }));
    } finally {
      setSaving(s => ({ ...s, [id]: false }));
    }
  };

  const handleToggleNotification = async (key) => {
    const current = settings[key] === "true";
    const newVal = (!current).toString();
    handleChange(key, newVal);
    try {
      await saveSetting(key, newVal, false);
    } catch (err) {
      console.error("Error saving notification pref:", err);
    }
  };

  const [testing, setTesting] = useState({});
  const [testResult, setTestResult] = useState({});

  const isConnected = (integration) => {
    return integration.fields.every(f => settings[f.key] && settings[f.key].trim().length > 0);
  };

  const handleTestConnection = async (integration) => {
    const id = integration.id;
    setTesting(s => ({ ...s, [id]: true }));
    setTestResult(s => ({ ...s, [id]: null }));
    try {
      if (id === "n8n") {
        const url = (settings.N8N_WEBHOOK_BASE_URL || "").replace(/\/+$/, "");
        if (!url) throw new Error("URL não configurada");
        const res = await fetch(url, { method: "HEAD", mode: "no-cors" });
        setTestResult(s => ({ ...s, [id]: { ok: true, msg: "Servidor acessível" } }));
      } else if (id === "ses") {
        // Basic validation — keys present and formatted
        const accessKey = settings.AWS_ACCESS_KEY_ID || "";
        const secretKey = settings.AWS_SECRET_ACCESS_KEY || "";
        if (!accessKey.startsWith("AKIA")) throw new Error("Access Key deve começar com AKIA");
        if (secretKey.length < 20) throw new Error("Secret Key parece inválida");
        setTestResult(s => ({ ...s, [id]: { ok: true, msg: "Credenciais formatadas corretamente" } }));
      } else if (id === "millionverifier") {
        const apiKey = settings.MILLIONVERIFIER_API_KEY || "";
        if (apiKey.length < 10) throw new Error("API Key parece inválida");
        setTestResult(s => ({ ...s, [id]: { ok: true, msg: "API Key configurada" } }));
      } else if (id === "gemini") {
        const apiKey = settings.GEMINI_API_KEY || "";
        if (apiKey.length < 10) throw new Error("API Key parece inválida");
        setTestResult(s => ({ ...s, [id]: { ok: true, msg: "API Key configurada" } }));
      }
      setTimeout(() => setTestResult(s => ({ ...s, [id]: null })), 5000);
    } catch (err) {
      setTestResult(s => ({ ...s, [id]: { ok: false, msg: err.message } }));
      setTimeout(() => setTestResult(s => ({ ...s, [id]: null })), 5000);
    } finally {
      setTesting(s => ({ ...s, [id]: false }));
    }
  };

  if (loading) {
    return (
      <div className="cm-page" style={{ padding: "28px 36px", background: C.bg, minHeight: "100vh" }}>
        <div style={{ marginBottom: 28, height: 50 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[1, 2, 3, 4].map(i => <SkeletonChart key={i} height={160} />)}
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
        ::placeholder { color: ${C.textDim}; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 28, animation: "fadeIn 0.4s ease-out" }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>
          Configurações
        </h1>
        <p style={{ fontSize: 14, color: C.textDim }}>
          Gerencie integrações, API keys e preferências
        </p>
      </div>

      {/* Integrations */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
        {integrations.map((integ, idx) => {
          const Icon = integ.icon;
          const connected = isConnected(integ);
          return (
            <div key={integ.id} style={{
              background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
              padding: "24px", animation: `fadeIn 0.4s ease-out ${0.1 * idx}s both`,
            }}>
              {/* Integration Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 12,
                    background: `${integ.color}15`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon size={20} color={integ.color} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>{integ.name}</h3>
                    <p style={{ fontSize: 13, color: C.textDim }}>{integ.description}</p>
                  </div>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 8,
                  background: connected ? C.accentBg : "rgba(113,113,122,0.1)",
                  color: connected ? C.accent : C.textDim,
                  display: "flex", alignItems: "center", gap: 5,
                }}>
                  {connected ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                  {connected ? "Conectado" : "Não configurado"}
                </span>
              </div>

              {/* Fields */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
                {integ.fields.map(field => (
                  <div key={field.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <label style={{
                      width: 200, fontSize: 12, fontWeight: 500, color: C.textMuted,
                      fontFamily: "'JetBrains Mono', monospace", flexShrink: 0,
                    }}>{field.key}</label>
                    <div style={{ flex: 1, position: "relative" }}>
                      <input
                        type={field.secret && !showSecrets[field.key] ? "password" : "text"}
                        value={settings[field.key] || ""}
                        onChange={e => handleChange(field.key, e.target.value)}
                        placeholder={field.placeholder || "••••••••"}
                        style={{
                          width: "100%", padding: "9px 14px",
                          paddingRight: field.secret ? 40 : 14,
                          borderRadius: 10, border: `1px solid ${C.border}`,
                          background: C.bg, color: C.text, fontSize: 13, outline: "none",
                          boxSizing: "border-box", transition: "border-color 0.2s",
                        }}
                        onFocus={e => e.target.style.borderColor = C.accent}
                        onBlur={e => e.target.style.borderColor = C.border}
                      />
                      {field.secret && (
                        <button
                          type="button"
                          onClick={() => setShowSecrets(s => ({ ...s, [field.key]: !s[field.key] }))}
                          style={{
                            position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                            background: "none", border: "none", cursor: "pointer", color: C.textDim,
                            padding: 2,
                          }}
                        >
                          {showSecrets[field.key] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Error */}
              {errors[integ.id] && (
                <div style={{
                  background: C.dangerBg, border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10,
                  padding: "8px 12px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8,
                }}>
                  <AlertTriangle size={13} color={C.danger} />
                  <span style={{ fontSize: 12, color: C.danger }}>{errors[integ.id]}</span>
                </div>
              )}

              {/* Buttons */}
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button
                  onClick={() => handleSaveIntegration(integ)}
                  disabled={saving[integ.id]}
                  style={{
                    padding: "9px 20px", borderRadius: 10, border: "none",
                    background: saved[integ.id]
                      ? C.accentBg
                      : `linear-gradient(135deg, ${C.accent}, ${C.accentDim})`,
                    color: saved[integ.id] ? C.accent : "#fff",
                    fontSize: 13, fontWeight: 600,
                    cursor: saving[integ.id] ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", gap: 6,
                    opacity: saving[integ.id] ? 0.7 : 1,
                    transition: "all 0.3s",
                    boxShadow: saved[integ.id] ? "none" : "0 4px 16px rgba(16,185,129,0.3)",
                  }}
                >
                  {saving[integ.id] ? (
                    <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                  ) : saved[integ.id] ? (
                    <CheckCircle2 size={14} />
                  ) : (
                    <Save size={14} />
                  )}
                  {saving[integ.id] ? "Salvando..." : saved[integ.id] ? "Salvo!" : "Salvar configuração"}
                </button>

                {connected && (
                  <button
                    onClick={() => handleTestConnection(integ)}
                    disabled={testing[integ.id]}
                    style={{
                      padding: "9px 16px", borderRadius: 10,
                      border: `1px solid ${C.border}`,
                      background: "transparent",
                      color: C.textMuted, fontSize: 13, fontWeight: 500,
                      cursor: testing[integ.id] ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", gap: 6,
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderLight; e.currentTarget.style.color = C.text; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; }}
                  >
                    {testing[integ.id]
                      ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                      : <Wifi size={14} />
                    }
                    Testar Conexão
                  </button>
                )}

                {testResult[integ.id] && (
                  <span style={{
                    fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 5,
                    color: testResult[integ.id].ok ? C.accent : C.danger,
                  }}>
                    {testResult[integ.id].ok ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                    {testResult[integ.id].msg}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Notifications */}
      <div style={{
        background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
        padding: "24px", animation: "fadeIn 0.4s ease-out 0.5s both",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <Bell size={20} color={C.accent} />
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Notificações</h3>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {notificationKeys.map(n => {
            const enabled = settings[n.key] === "true";
            return (
              <div key={n.key} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 16px", borderRadius: 12, border: `1px solid ${C.border}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {enabled ? <Bell size={16} color={C.accent} /> : <BellOff size={16} color={C.textDim} />}
                  <span style={{ fontSize: 14, fontWeight: 500, color: enabled ? C.text : C.textDim }}>
                    {n.label}
                  </span>
                </div>
                <button onClick={() => handleToggleNotification(n.key)} style={{
                  width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
                  background: enabled ? C.accent : C.borderLight, transition: "background 0.2s",
                  position: "relative",
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 9, background: "#fff",
                    position: "absolute", top: 3,
                    left: enabled ? 23 : 3, transition: "left 0.2s",
                  }} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
