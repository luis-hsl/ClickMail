import { C } from '@/theme/colors'

const shimmerStyle = `
@keyframes shimmer {
  0% { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
`

const baseStyle = {
  background: `linear-gradient(90deg, ${C.card} 0%, ${C.cardHover} 40%, ${C.card} 80%)`,
  backgroundSize: '800px 100%',
  animation: 'shimmer 1.5s infinite linear',
  borderRadius: 12,
}

export function SkeletonCard({ count = 4 }) {
  return (
    <>
      <style>{shimmerStyle}</style>
      <div className="skeleton-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{
            ...baseStyle, height: 110, border: `1px solid ${C.border}`,
          }} />
        ))}
      </div>
    </>
  )
}

export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <>
      <style>{shimmerStyle}</style>
      <div style={{
        border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden',
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 1,
          padding: '14px 18px', background: C.card, borderBottom: `1px solid ${C.border}`,
        }}>
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} style={{ ...baseStyle, height: 14, borderRadius: 6, width: '70%' }} />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} style={{
            display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 1,
            padding: '14px 18px', borderBottom: r < rows - 1 ? `1px solid ${C.border}` : 'none',
          }}>
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} style={{ ...baseStyle, height: 12, borderRadius: 6, width: c === 0 ? '85%' : '60%' }} />
            ))}
          </div>
        ))}
      </div>
    </>
  )
}

export function SkeletonChart({ height = 240 }) {
  return (
    <>
      <style>{shimmerStyle}</style>
      <div style={{
        ...baseStyle, height, border: `1px solid ${C.border}`,
      }} />
    </>
  )
}
