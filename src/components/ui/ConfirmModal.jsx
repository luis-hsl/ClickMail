import { C } from '@/theme/colors'
import { AlertTriangle } from 'lucide-react'

export default function ConfirmModal({ open, title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', onConfirm, onCancel, danger = false }) {
  if (!open) return null

  const accentColor = danger ? C.danger : C.accent
  const accentBg = danger ? C.dangerBg : C.accentBg

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
    }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 16,
        padding: 28, maxWidth: 420, width: '90%', boxShadow: '0 16px 64px rgba(0,0,0,0.5)',
        animation: 'modal-in 0.2s ease-out',
      }}>
        <style>{`
          @keyframes modal-in {
            from { opacity: 0; transform: scale(0.95) translateY(8px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>
        {danger && (
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: C.dangerBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          }}>
            <AlertTriangle size={22} color={C.danger} />
          </div>
        )}
        <h3 style={{ color: C.text, fontSize: 16, fontWeight: 600, margin: 0, marginBottom: 8 }}>{title}</h3>
        <p style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.5, margin: 0, marginBottom: 24 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{
            padding: '9px 18px', borderRadius: 10, border: `1px solid ${C.border}`,
            background: 'transparent', color: C.textMuted, fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}>
            {cancelLabel}
          </button>
          <button onClick={onConfirm} style={{
            padding: '9px 18px', borderRadius: 10, border: 'none',
            background: accentColor, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
