import { useState, useEffect, useRef } from "react";
import Papa from "papaparse";
import {
  Upload, Users, CheckCircle2, XCircle, AlertTriangle, FileSpreadsheet,
  Plus, Loader2, ChevronLeft, ChevronRight, Download, Trash2, X, Search,
  Eye, ArrowLeft,
} from "lucide-react";
import { listService, contactService, n8nService } from "@/services/api";
import { supabase } from "@/lib/supabase";
import { C } from "@/theme/colors";
import { SkeletonTable } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useToast } from "@/contexts/ToastContext";

const verificationColors = {
  pending: { color: C.textDim, bg: "rgba(113,113,122,0.1)", label: "Pendente" },
  processing: { color: C.info, bg: C.infoBg, label: "Verificando" },
  completed: { color: C.accent, bg: C.accentBg, label: "Verificada" },
  failed: { color: C.danger, bg: C.dangerBg, label: "Falhou" },
};

const contactStatusColors = {
  pending: { color: C.textDim, label: "Pendente" },
  valid: { color: C.accent, label: "Válido" },
  invalid: { color: C.danger, label: "Inválido" },
  risky: { color: C.warning, label: "Risco" },
  unknown: { color: C.textMuted, label: "Desconhecido" },
};

// ── Lists View ──
function ListsView({ lists, loading, onOpenList, onUpload, onDelete, onVerify, verifying }) {
  const [dragOver, setDragOver] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [listName, setListName] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const handleFile = (f) => {
    if (f && f.name.endsWith(".csv")) {
      setFile(f);
      setListName(f.name.replace(".csv", ""));
      setShowUpload(true);
      setError(null);
    } else {
      setError("Selecione um arquivo CSV válido");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmitUpload = async (e) => {
    e.preventDefault();
    if (!file || !listName.trim()) return;
    setUploading(true);
    setError(null);
    try {
      setUploadProgress("Criando lista...");
      const list = await listService.create({
        name: listName.trim(),
        original_filename: file.name,
      });

      setUploadProgress("Fazendo upload do CSV...");
      await listService.uploadCSV(file, list.id);

      setUploadProgress("Parseando contatos...");
      const parsed = await new Promise((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (r) => resolve(r),
          error: (err) => reject(err),
        });
      });

      const emailCol = Object.keys(parsed.data[0] || {}).find(
        k => k.toLowerCase().includes("email") || k.toLowerCase() === "e-mail"
      );
      if (!emailCol) throw new Error("Coluna de email não encontrada no CSV");

      const contacts = parsed.data
        .filter(row => row[emailCol] && row[emailCol].includes("@"))
        .map(row => {
          const extra = { ...row };
          delete extra[emailCol];
          const nameCol = Object.keys(row).find(k => k.toLowerCase().includes("name") || k.toLowerCase().includes("nome"));
          const companyCol = Object.keys(row).find(k => k.toLowerCase().includes("company") || k.toLowerCase().includes("empresa"));
          return {
            list_id: list.id,
            email: row[emailCol].trim().toLowerCase(),
            name: nameCol ? row[nameCol] : null,
            company: companyCol ? row[companyCol] : null,
            extra_data: Object.keys(extra).length > 0 ? extra : {},
          };
        });

      if (contacts.length === 0) throw new Error("Nenhum email válido encontrado no CSV");

      setUploadProgress(`Inserindo ${contacts.length} contatos...`);
      // Insert in batches of 500
      for (let i = 0; i < contacts.length; i += 500) {
        const batch = contacts.slice(i, i + 500);
        await contactService.bulkInsert(batch);
        setUploadProgress(`Inserindo contatos... ${Math.min(i + 500, contacts.length)}/${contacts.length}`);
      }

      // Update list counts
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("email_lists").update({
        total_contacts: contacts.length,
        file_path: `${user.id}/lists/${list.id}/${file.name}`,
        updated_at: new Date().toISOString(),
      }).eq("id", list.id);

      // Trigger n8n email verification workflow
      setUploadProgress("Iniciando verificação de emails...");
      try {
        await n8nService.triggerVerifyList(list.id);
      } catch (verifyErr) {
        console.warn("Verificação automática falhou (pode ser executada manualmente):", verifyErr);
      }

      setShowUpload(false);
      setFile(null);
      setListName("");
      await onUpload();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  };

  if (loading) {
    return (
      <div className="cm-page" style={{ padding: "28px 36px", background: C.bg, minHeight: "100vh" }}>
        <div style={{ marginBottom: 28, height: 50 }} />
        <SkeletonTable rows={6} />
      </div>
    );
  }

  return (
    <>
      {/* Upload Area */}
      {!showUpload ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            background: C.card, borderRadius: 16, padding: "48px 24px",
            border: `2px dashed ${dragOver ? C.accent : C.border}`,
            textAlign: "center", cursor: "pointer", transition: "all 0.2s",
            marginBottom: 20, animation: "fadeIn 0.4s ease-out 0.1s both",
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = C.borderLight}
          onMouseLeave={e => { if (!dragOver) e.currentTarget.style.borderColor = C.border; }}
        >
          <Upload size={36} color={dragOver ? C.accent : C.textDim} style={{ margin: "0 auto 12px" }} />
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
            Arraste um arquivo CSV aqui ou clique para selecionar
          </p>
          <p style={{ fontSize: 12, color: C.textDim }}>
            O CSV deve conter pelo menos uma coluna de "email"
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={(e) => handleFile(e.target.files[0])}
            style={{ display: "none" }}
          />
        </div>
      ) : (
        <div style={{
          background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
          padding: "24px", marginBottom: 20, animation: "fadeIn 0.3s ease-out",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Importar Lista</h3>
            <button onClick={() => { setShowUpload(false); setFile(null); setError(null); }} style={{
              background: "none", border: "none", cursor: "pointer", color: C.textDim, padding: 4,
            }}>
              <X size={18} />
            </button>
          </div>

          {error && (
            <div style={{
              background: C.dangerBg, border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10,
              padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8,
            }}>
              <AlertTriangle size={14} color={C.danger} />
              <span style={{ fontSize: 13, color: C.danger }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmitUpload}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textMuted, marginBottom: 6 }}>
                Nome da lista
              </label>
              <input
                type="text"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                placeholder="Ex: Base Previsão.io"
                required
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10,
                  border: `1px solid ${C.border}`, background: C.bg, color: C.text,
                  fontSize: 14, outline: "none", boxSizing: "border-box",
                }}
                onFocus={(e) => e.target.style.borderColor = C.accent}
                onBlur={(e) => e.target.style.borderColor = C.border}
              />
            </div>

            <div style={{
              padding: "12px 14px", borderRadius: 10, border: `1px solid ${C.border}`,
              background: C.bg, marginBottom: 16, display: "flex", alignItems: "center", gap: 10,
            }}>
              <FileSpreadsheet size={18} color={C.accent} />
              <span style={{ fontSize: 13, color: C.text, flex: 1 }}>{file?.name}</span>
              <span style={{ fontSize: 12, color: C.textDim, fontFamily: "'JetBrains Mono', monospace" }}>
                {(file?.size / 1024).toFixed(1)} KB
              </span>
            </div>

            {uploading && (
              <div style={{
                padding: "10px 14px", borderRadius: 10, background: C.accentBg,
                marginBottom: 16, display: "flex", alignItems: "center", gap: 8,
              }}>
                <Loader2 size={14} color={C.accent} style={{ animation: "spin 1s linear infinite" }} />
                <span style={{ fontSize: 13, color: C.accent }}>{uploadProgress}</span>
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button type="submit" disabled={uploading} style={{
                padding: "10px 24px", borderRadius: 10, border: "none",
                background: `linear-gradient(135deg, ${C.accent}, ${C.accentDim})`,
                color: "#fff", fontSize: 13, fontWeight: 600,
                cursor: uploading ? "not-allowed" : "pointer",
                opacity: uploading ? 0.7 : 1, display: "flex", alignItems: "center", gap: 6,
              }}>
                {uploading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Upload size={14} />}
                {uploading ? "Importando..." : "Importar"}
              </button>
              <button type="button" onClick={() => { setShowUpload(false); setFile(null); setError(null); }} style={{
                padding: "10px 16px", borderRadius: 10, border: `1px solid ${C.border}`,
                background: "transparent", color: C.textMuted, fontSize: 13, cursor: "pointer",
              }}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats Overview */}
      {lists.length > 0 && (
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20,
          animation: "fadeIn 0.4s ease-out 0.15s both",
        }}>
          {[
            { icon: Users, label: "Total", value: lists.reduce((s, l) => s + (l.total_contacts || 0), 0), color: C.text },
            { icon: CheckCircle2, label: "Válidos", value: lists.reduce((s, l) => s + (l.valid_contacts || 0), 0), color: C.accent },
            { icon: XCircle, label: "Inválidos", value: lists.reduce((s, l) => s + (l.invalid_contacts || 0), 0), color: C.danger },
            { icon: AlertTriangle, label: "Risco", value: lists.reduce((s, l) => s + (l.risky_contacts || 0), 0), color: C.warning },
          ].map(m => (
            <div key={m.label} style={{
              padding: "14px 16px", borderRadius: 12, border: `1px solid ${C.border}`,
              background: C.card, display: "flex", alignItems: "center", gap: 10,
            }}>
              <m.icon size={18} color={m.color} />
              <div>
                <p style={{ fontSize: 11, color: C.textDim }}>{m.label}</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: m.color, fontFamily: "'JetBrains Mono', monospace" }}>
                  {m.value.toLocaleString("pt-BR")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lists Table */}
      {lists.length === 0 ? (
        <div style={{
          background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
          padding: "60px 24px", textAlign: "center", animation: "fadeIn 0.4s ease-out 0.2s both",
        }}>
          <FileSpreadsheet size={48} color={C.borderLight} style={{ margin: "0 auto 16px" }} />
          <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Nenhuma lista importada</h3>
          <p style={{ fontSize: 14, color: C.textDim }}>
            Faça upload de um CSV com sua base de emails para começar.
          </p>
        </div>
      ) : (
        <div style={{
          background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
          overflow: "hidden", animation: "fadeIn 0.4s ease-out 0.2s both",
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {["Nome", "Contatos", "Válidos", "Inválidos", "Risco", "Verificação", "Ações"].map(h => (
                  <th key={h} style={{
                    padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 600,
                    color: C.textDim, textTransform: "uppercase", letterSpacing: "0.05em",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lists.map(l => {
                const vStatus = verificationColors[l.verification_status] || verificationColors.pending;
                return (
                  <tr key={l.id} style={{
                    borderBottom: `1px solid ${C.border}`, cursor: "pointer", transition: "background 0.15s",
                  }}
                    onClick={() => onOpenList(l)}
                    onMouseEnter={e => e.currentTarget.style.background = C.cardHover}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{l.name}</span>
                      {l.original_filename && (
                        <p style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{l.original_filename}</p>
                      )}
                    </td>
                    <td style={{ padding: "14px 16px", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600 }}>
                      {(l.total_contacts || 0).toLocaleString("pt-BR")}
                    </td>
                    <td style={{ padding: "14px 16px", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: C.accent }}>
                      {(l.valid_contacts || 0).toLocaleString("pt-BR")}
                    </td>
                    <td style={{ padding: "14px 16px", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: C.danger }}>
                      {(l.invalid_contacts || 0).toLocaleString("pt-BR")}
                    </td>
                    <td style={{ padding: "14px 16px", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: C.warning }}>
                      {(l.risky_contacts || 0).toLocaleString("pt-BR")}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 6,
                        background: vStatus.bg, color: vStatus.color,
                      }}>{vStatus.label}</span>
                    </td>
                    <td style={{ padding: "14px 16px" }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 6 }}>
                        {l.verification_status === "pending" && (
                          <button
                            onClick={() => onVerify(l.id)}
                            disabled={verifying === l.id}
                            style={{
                              background: "none", border: `1px solid ${C.border}`, borderRadius: 6,
                              padding: "5px 7px", cursor: verifying === l.id ? "not-allowed" : "pointer",
                              color: C.info, fontSize: 11, fontWeight: 600,
                              display: "flex", alignItems: "center", gap: 4,
                            }}
                            onMouseEnter={e => { if (verifying !== l.id) e.currentTarget.style.borderColor = C.info; }}
                            onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
                          >
                            {verifying === l.id ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <CheckCircle2 size={12} />}
                            Verificar
                          </button>
                        )}
                        {l.verification_status === "processing" && (
                          <span style={{
                            display: "flex", alignItems: "center", gap: 4, padding: "5px 7px",
                            fontSize: 11, color: C.info,
                          }}>
                            <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                            Verificando...
                          </span>
                        )}
                        <button onClick={() => onOpenList(l)} style={{
                          background: "none", border: `1px solid ${C.border}`, borderRadius: 6,
                          padding: "5px 7px", cursor: "pointer", color: C.textDim,
                        }}
                          onMouseEnter={e => { e.currentTarget.style.color = C.accent; e.currentTarget.style.borderColor = C.accent; }}
                          onMouseLeave={e => { e.currentTarget.style.color = C.textDim; e.currentTarget.style.borderColor = C.border; }}
                        >
                          <Eye size={14} />
                        </button>
                        <button onClick={() => onDelete(l.id, l.name)} style={{
                          background: "none", border: `1px solid ${C.border}`, borderRadius: 6,
                          padding: "5px 7px", cursor: "pointer", color: C.textDim,
                        }}
                          onMouseEnter={e => { e.currentTarget.style.color = C.danger; e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)"; }}
                          onMouseLeave={e => { e.currentTarget.style.color = C.textDim; e.currentTarget.style.borderColor = C.border; }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ── Contacts Detail View ──
function ContactsView({ list, onBack }) {
  const [contacts, setContacts] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const limit = 50;

  const loadContacts = async () => {
    setLoading(true);
    try {
      const { data, count: total } = await listService.getContacts(list.id, { page, limit, status: filter });
      setContacts(data || []);
      setCount(total || 0);
    } catch (err) {
      console.error("Error loading contacts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadContacts(); }, [page, filter]);

  const totalPages = Math.ceil(count / limit);

  const handleExport = async () => {
    setExporting(true);
    try {
      let allContacts = [];
      let p = 0;
      while (true) {
        const { data } = await listService.getContacts(list.id, { page: p, limit: 1000, status: "valid" });
        if (!data || data.length === 0) break;
        allContacts = allContacts.concat(data);
        p++;
      }
      const csv = Papa.unparse(allContacts.map(c => ({
        email: c.email,
        name: c.name || "",
        company: c.company || "",
        status: c.verification_status,
      })));
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${list.name}_validos.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setExporting(false);
    }
  };

  const filters = [
    { value: null, label: "Todos", count: list.total_contacts || 0 },
    { value: "valid", label: "Válidos", count: list.valid_contacts || 0, color: C.accent },
    { value: "invalid", label: "Inválidos", count: list.invalid_contacts || 0, color: C.danger },
    { value: "risky", label: "Risco", count: list.risky_contacts || 0, color: C.warning },
    { value: "pending", label: "Pendentes", count: (list.total_contacts || 0) - (list.valid_contacts || 0) - (list.invalid_contacts || 0) - (list.risky_contacts || 0), color: C.textDim },
  ];

  return (
    <>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, marginBottom: 20,
        animation: "fadeIn 0.3s ease-out",
      }}>
        <button onClick={onBack} style={{
          background: "none", border: `1px solid ${C.border}`, borderRadius: 8,
          padding: "7px 9px", cursor: "pointer", color: C.textDim, transition: "all 0.15s",
        }}
          onMouseEnter={e => { e.currentTarget.style.color = C.text; e.currentTarget.style.borderColor = C.borderLight; }}
          onMouseLeave={e => { e.currentTarget.style.color = C.textDim; e.currentTarget.style.borderColor = C.border; }}
        >
          <ArrowLeft size={16} />
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>{list.name}</h2>
          <p style={{ fontSize: 12, color: C.textDim }}>
            {list.original_filename} · {(list.total_contacts || 0).toLocaleString("pt-BR")} contatos
          </p>
        </div>
        <button onClick={handleExport} disabled={exporting} style={{
          padding: "8px 16px", borderRadius: 10, border: `1px solid ${C.border}`,
          background: C.card, color: C.textMuted, fontSize: 13, fontWeight: 500,
          cursor: exporting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6,
          opacity: exporting ? 0.7 : 1,
        }}>
          {exporting ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Download size={14} />}
          Exportar Válidos
        </button>
      </div>

      {/* Filters */}
      <div style={{
        display: "flex", gap: 8, marginBottom: 16, animation: "fadeIn 0.3s ease-out 0.1s both",
      }}>
        {filters.map(f => (
          <button key={f.label} onClick={() => { setFilter(f.value); setPage(0); }} style={{
            padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500,
            border: `1px solid ${filter === f.value ? (f.color || C.accent) : C.border}`,
            background: filter === f.value ? (f.color ? `${f.color}15` : C.accentBg) : "transparent",
            color: filter === f.value ? (f.color || C.accent) : C.textDim,
            cursor: "pointer", transition: "all 0.15s",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            {f.label}
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
              opacity: 0.8,
            }}>{f.count}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{
        background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
        overflow: "hidden", animation: "fadeIn 0.3s ease-out 0.15s both",
      }}>
        {loading ? (
          <div style={{ padding: "16px 24px" }}>
            <SkeletonTable rows={4} />
          </div>
        ) : contacts.length === 0 ? (
          <div style={{ padding: "60px 24px", textAlign: "center", color: C.textDim, fontSize: 13 }}>
            Nenhum contato encontrado com este filtro
          </div>
        ) : (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {["Email", "Nome", "Empresa", "Status", "Enviados", "Aberturas"].map(h => (
                    <th key={h} style={{
                      padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 600,
                      color: C.textDim, textTransform: "uppercase", letterSpacing: "0.05em",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contacts.map(c => {
                  const st = contactStatusColors[c.verification_status] || contactStatusColors.pending;
                  return (
                    <tr key={c.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{
                        padding: "12px 16px", fontSize: 13, fontFamily: "'JetBrains Mono', monospace",
                      }}>{c.email}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: c.name ? C.text : C.textDim }}>
                        {c.name || "—"}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: c.company ? C.text : C.textDim }}>
                        {c.company || "—"}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          fontSize: 12, fontWeight: 500, color: st.color,
                        }}>
                          <span style={{
                            width: 7, height: 7, borderRadius: "50%", background: st.color,
                          }} />
                          {st.label}
                        </span>
                      </td>
                      <td style={{
                        padding: "12px 16px", fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
                        color: C.textMuted,
                      }}>{c.total_sent || 0}</td>
                      <td style={{
                        padding: "12px 16px", fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
                        color: C.textMuted,
                      }}>{c.total_opened || 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 16px", borderTop: `1px solid ${C.border}`,
              }}>
                <span style={{ fontSize: 12, color: C.textDim }}>
                  {page * limit + 1}–{Math.min((page + 1) * limit, count)} de {count}
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{
                    padding: "5px 10px", borderRadius: 6, border: `1px solid ${C.border}`,
                    background: "transparent", color: page === 0 ? C.borderLight : C.textMuted,
                    cursor: page === 0 ? "not-allowed" : "pointer", fontSize: 12,
                  }}>
                    <ChevronLeft size={14} />
                  </button>
                  <span style={{
                    padding: "5px 12px", fontSize: 12, color: C.textMuted,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>{page + 1}/{totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} style={{
                    padding: "5px 10px", borderRadius: 6, border: `1px solid ${C.border}`,
                    background: "transparent", color: page >= totalPages - 1 ? C.borderLight : C.textMuted,
                    cursor: page >= totalPages - 1 ? "not-allowed" : "pointer", fontSize: 12,
                  }}>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

// ── Main Page ──
export default function Lists() {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedList, setSelectedList] = useState(null);
  const [verifying, setVerifying] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const toast = useToast();

  const loadLists = async () => {
    try {
      const data = await listService.list();
      setLists(data || []);
    } catch (err) {
      console.error("Error loading lists:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLists(); }, []);

  // Realtime: subscribe to email_lists and email_contacts changes
  useEffect(() => {
    const channel = supabase
      .channel("lists-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "email_lists" }, () => {
        loadLists();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "email_contacts" }, () => {
        loadLists();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleVerify = async (listId) => {
    setVerifying(listId);
    try {
      await n8nService.triggerVerifyList(listId);
      await loadLists();
      toast.success("Verificação iniciada");
    } catch (err) {
      toast.error("Erro ao iniciar verificação: " + err.message);
    } finally {
      setVerifying(null);
    }
  };

  const handleDelete = async (id, name) => {
    setConfirmDelete({ id, name });
  };

  const confirmDeleteList = async () => {
    if (!confirmDelete) return;
    try {
      await supabase.from("email_contacts").delete().eq("list_id", confirmDelete.id);
      await supabase.from("email_lists").delete().eq("id", confirmDelete.id);
      await loadLists();
      toast.success("Lista removida");
    } catch (err) {
      toast.error("Erro ao remover lista");
    } finally {
      setConfirmDelete(null);
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
        ::placeholder { color: ${C.textDim}; }
      `}</style>

      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        marginBottom: 28, animation: "fadeIn 0.4s ease-out",
      }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>
            Listas
          </h1>
          <p style={{ fontSize: 14, color: C.textDim }}>
            Importe e verifique suas bases de contatos
          </p>
        </div>
      </div>

      {selectedList ? (
        <ContactsView
          list={selectedList}
          onBack={() => { setSelectedList(null); loadLists(); }}
        />
      ) : (
        <ListsView
          lists={lists}
          loading={loading}
          onOpenList={setSelectedList}
          onUpload={loadLists}
          onDelete={handleDelete}
          onVerify={handleVerify}
          verifying={verifying}
        />
      )}

      <ConfirmModal
        open={!!confirmDelete}
        title="Remover lista"
        message={`Tem certeza que deseja remover a lista "${confirmDelete?.name}" e todos seus contatos?`}
        confirmLabel="Remover"
        danger
        onConfirm={confirmDeleteList}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
