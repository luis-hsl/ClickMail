import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { C } from '@/theme/colors'
import {
  LayoutDashboard, Globe, Users, Send, Settings,
  Zap, Flame, Shield, LogOut, Menu, X,
} from 'lucide-react'

const mainNav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/domains', icon: Globe, label: 'Domínios' },
  { to: '/lists', icon: Users, label: 'Listas' },
  { to: '/campaigns', icon: Send, label: 'Campanhas' },
]

const systemNav = [
  { to: '/warmup', icon: Flame, label: 'Aquecimento' },
  { to: '/reputation', icon: Shield, label: 'Reputação' },
  { to: '/settings', icon: Settings, label: 'Configurações' },
]

function SidebarLink({ to, icon: Icon, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      style={{ textDecoration: 'none' }}
    >
      {({ isActive }) => (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderRadius: 10,
            cursor: 'pointer', transition: 'all 0.15s', position: 'relative',
            background: isActive ? C.accentBg : 'transparent',
            color: isActive ? C.accent : C.textDim,
          }}
          onMouseEnter={e => {
            if (!isActive) {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
              e.currentTarget.style.color = C.text
            }
          }}
          onMouseLeave={e => {
            if (!isActive) {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = C.textDim
            }
          }}
        >
          {isActive && <div style={{
            position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
            width: 3, height: 20, borderRadius: 4, background: C.accent,
          }} />}
          <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
          <span style={{ fontSize: 14, fontWeight: isActive ? 600 : 400 }}>{label}</span>
        </div>
      )}
    </NavLink>
  )
}

export default function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div style={{
      display: 'flex', minHeight: '100vh', background: C.bg,
      fontFamily: "'DM Sans', sans-serif", color: C.text,
    }}>
      <style>{`
        @media (max-width: 768px) {
          .cm-sidebar { position: fixed !important; left: 0; top: 0; bottom: 0; z-index: 1000; transform: translateX(-100%); transition: transform 0.25s ease; }
          .cm-sidebar.open { transform: translateX(0); }
          .cm-sidebar-overlay { display: block !important; }
          .cm-mobile-header { display: flex !important; }
          .cm-main { margin-left: 0 !important; }
          .cm-page { padding: 20px 16px !important; }
          .cm-grid-4 { grid-template-columns: 1fr 1fr !important; }
          .cm-grid-6, .cm-grid-5, .cm-grid-3 { grid-template-columns: 1fr !important; }
          .cm-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        }
        @media (max-width: 480px) {
          .cm-grid-4 { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 769px) {
          .cm-sidebar-overlay { display: none !important; }
          .cm-mobile-header { display: none !important; }
        }
      `}</style>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="cm-sidebar-overlay" onClick={closeSidebar} style={{
          display: 'none', position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)',
        }} />
      )}

      {/* Mobile header */}
      <div className="cm-mobile-header" style={{
        display: 'none', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 998,
        height: 56, background: C.sidebar, borderBottom: `1px solid ${C.border}`,
        alignItems: 'center', padding: '0 16px', gap: 12,
      }}>
        <button onClick={() => setSidebarOpen(true)} style={{
          background: 'none', border: 'none', color: C.text, cursor: 'pointer', padding: 4,
          display: 'flex',
        }}>
          <Menu size={22} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: `linear-gradient(135deg, ${C.accent}, ${C.accentDim})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={14} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 800 }}>Clickmail</span>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={`cm-sidebar${sidebarOpen ? ' open' : ''}`} style={{
        width: 240, background: C.sidebar, borderRight: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{
          padding: '24px 20px 20px', display: 'flex', alignItems: 'center', gap: 10,
          borderBottom: `1px solid ${C.border}`,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `linear-gradient(135deg, ${C.accent}, ${C.accentDim})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(16,185,129,0.25)',
          }}>
            <Zap size={20} color="#fff" strokeWidth={2.5} />
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.03em' }}>Clickmail</span>
            <span style={{
              display: 'block', fontSize: 10, color: C.textDim, fontWeight: 500,
              letterSpacing: '0.05em', textTransform: 'uppercase',
            }}>by Oneclick</span>
          </div>
          {/* Mobile close button */}
          <button className="cm-mobile-header" onClick={closeSidebar} style={{
            display: 'none', background: 'none', border: 'none', color: C.textDim,
            cursor: 'pointer', padding: 4,
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <p style={{
            fontSize: 10, fontWeight: 600, color: C.textDim, textTransform: 'uppercase',
            letterSpacing: '0.08em', padding: '8px 16px 6px',
          }}>Principal</p>
          {mainNav.map(item => (
            <div key={item.to} onClick={closeSidebar}>
              <SidebarLink {...item} end={item.to === '/'} />
            </div>
          ))}

          <div style={{ height: 16 }} />

          <p style={{
            fontSize: 10, fontWeight: 600, color: C.textDim, textTransform: 'uppercase',
            letterSpacing: '0.08em', padding: '8px 16px 6px',
          }}>Sistema</p>
          {systemNav.map(item => (
            <div key={item.to} onClick={closeSidebar}>
              <SidebarLink {...item} />
            </div>
          ))}
        </nav>

        {/* User + Logout */}
        <div style={{ padding: '16px 16px 20px', borderTop: `1px solid ${C.border}` }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
            padding: '0 4px',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: C.accentBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: C.accent,
            }}>
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: 13, fontWeight: 600, color: C.text,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {user?.email || 'Usuário'}
              </p>
              <p style={{ fontSize: 11, color: C.textDim }}>Admin</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`,
              background: 'transparent', color: C.textDim, fontSize: 13, fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'
              e.currentTarget.style.color = '#ef4444'
              e.currentTarget.style.background = 'rgba(239,68,68,0.08)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = C.border
              e.currentTarget.style.color = C.textDim
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <LogOut size={15} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="cm-main" style={{ flex: 1, overflow: 'auto', paddingTop: 0 }}>
        <style>{`
          @media (max-width: 768px) {
            .cm-main { padding-top: 56px !important; }
          }
        `}</style>
        <Outlet />
      </main>
    </div>
  )
}
