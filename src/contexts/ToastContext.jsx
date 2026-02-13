import { createContext, useContext, useState, useCallback } from 'react'
import { C } from '@/theme/colors'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const typeConfig = {
  success: { icon: CheckCircle2, color: C.accent, bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)' },
  error: { icon: XCircle, color: C.danger, bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)' },
  info: { icon: Info, color: C.info, bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)' },
}

let toastId = 0

function Toast({ id, message, type, onClose }) {
  const cfg = typeConfig[type] || typeConfig.info
  const Icon = cfg.icon
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
      background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 12,
      color: C.text, fontSize: 13, fontWeight: 500, minWidth: 280, maxWidth: 420,
      backdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      animation: 'toast-in 0.3s ease-out',
    }}>
      <Icon size={18} color={cfg.color} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={() => onClose(id)} style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: 2,
        color: C.textDim, display: 'flex', flexShrink: 0,
      }}>
        <X size={14} />
      </button>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const addToast = useCallback((message, type = 'info') => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => removeToast(id), 4000)
  }, [removeToast])

  const toast = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    info: (msg) => addToast(msg, 'info'),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {toasts.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <style>{`
            @keyframes toast-in {
              from { opacity: 0; transform: translateX(40px); }
              to { opacity: 1; transform: translateX(0); }
            }
          `}</style>
          {toasts.map(t => (
            <Toast key={t.id} {...t} onClose={removeToast} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
