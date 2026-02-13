import { C } from '@/theme/colors'

const icons = {
  inbox: (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <rect x="12" y="18" width="40" height="32" rx="4" stroke={C.borderLight} strokeWidth="2" />
      <path d="M12 38L24 32L32 36L40 32L52 38" stroke={C.borderLight} strokeWidth="2" />
      <circle cx="32" cy="28" r="4" stroke={C.textDim} strokeWidth="2" />
    </svg>
  ),
  mail: (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <rect x="10" y="16" width="44" height="32" rx="4" stroke={C.borderLight} strokeWidth="2" />
      <path d="M10 20L32 36L54 20" stroke={C.borderLight} strokeWidth="2" />
      <circle cx="32" cy="32" r="3" fill={C.textDim} />
    </svg>
  ),
  globe: (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="20" stroke={C.borderLight} strokeWidth="2" />
      <ellipse cx="32" cy="32" rx="10" ry="20" stroke={C.borderLight} strokeWidth="2" />
      <line x1="12" y1="32" x2="52" y2="32" stroke={C.borderLight} strokeWidth="2" />
      <line x1="32" y1="12" x2="32" y2="52" stroke={C.borderLight} strokeWidth="2" />
    </svg>
  ),
  chart: (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <rect x="14" y="36" width="8" height="16" rx="2" stroke={C.borderLight} strokeWidth="2" />
      <rect x="28" y="24" width="8" height="28" rx="2" stroke={C.borderLight} strokeWidth="2" />
      <rect x="42" y="16" width="8" height="36" rx="2" stroke={C.borderLight} strokeWidth="2" />
      <line x1="10" y1="54" x2="54" y2="54" stroke={C.textDim} strokeWidth="2" />
    </svg>
  ),
  flame: (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <path d="M32 12C32 12 20 28 20 38C20 46 25.4 52 32 52C38.6 52 44 46 44 38C44 28 32 12 32 12Z" stroke={C.borderLight} strokeWidth="2" />
      <path d="M32 32C32 32 28 38 28 42C28 44.2 29.8 46 32 46C34.2 46 36 44.2 36 42C36 38 32 32 32 32Z" stroke={C.textDim} strokeWidth="2" />
    </svg>
  ),
}

export default function EmptyState({ icon = 'inbox', title, description, action }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '60px 20px', textAlign: 'center',
    }}>
      <div style={{ marginBottom: 20, opacity: 0.6 }}>
        {icons[icon] || icons.inbox}
      </div>
      <h3 style={{ color: C.text, fontSize: 16, fontWeight: 600, margin: 0, marginBottom: 6 }}>
        {title}
      </h3>
      <p style={{ color: C.textDim, fontSize: 13, margin: 0, maxWidth: 320, lineHeight: 1.5 }}>
        {description}
      </p>
      {action && (
        <button onClick={action.onClick} style={{
          marginTop: 20, padding: '10px 20px', borderRadius: 10, border: 'none',
          background: C.accent, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {action.icon && <action.icon size={15} />}
          {action.label}
        </button>
      )}
    </div>
  )
}
