import { Outlet, NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Globe,
  Users,
  Send,
  Settings,
  Mail,
} from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/domains', icon: Globe, label: 'Domínios' },
  { to: '/lists', icon: Users, label: 'Listas' },
  { to: '/campaigns', icon: Send, label: 'Campanhas' },
  { to: '/settings', icon: Settings, label: 'Configurações' },
]

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-800">
          <Mail className="w-7 h-7 text-brand-400" />
          <span className="text-xl font-bold tracking-tight">Clickmail</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-6 py-4 border-t border-gray-800">
          <p className="text-xs text-gray-500">Clickmail v0.1.0</p>
          <p className="text-xs text-gray-600">by Oneclick</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
