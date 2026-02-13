import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Zap, Mail, Lock, Loader2, AlertCircle } from 'lucide-react'
import { C } from '@/theme/colors'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/')
    } catch (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'Email ou senha incorretos'
        : err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif", color: C.text,
    }}>
      <div style={{
        width: '100%', maxWidth: 400, padding: '0 24px',
        animation: 'fadeIn 0.4s ease-out',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 40 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: `linear-gradient(135deg, ${C.accent}, ${C.accentDim})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(16,185,129,0.3)',
          }}>
            <Zap size={24} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em' }}>Clickmail</span>
            <span style={{
              display: 'block', fontSize: 10, color: C.textDim, fontWeight: 500,
              letterSpacing: '0.05em', textTransform: 'uppercase',
            }}>by Oneclick</span>
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
          padding: '32px 28px',
        }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, textAlign: 'center' }}>
            Entrar na plataforma
          </h1>
          <p style={{ fontSize: 13, color: C.textDim, textAlign: 'center', marginBottom: 28 }}>
            Insira suas credenciais para acessar o painel
          </p>

          {error && (
            <div style={{
              background: C.dangerBg, border: `1px solid rgba(239,68,68,0.2)`, borderRadius: 10,
              padding: '10px 14px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <AlertCircle size={16} color={C.danger} />
              <span style={{ fontSize: 13, color: C.danger }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: C.textMuted, marginBottom: 6 }}>
                Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color={C.textDim} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@oneclickfy.com"
                  required
                  style={{
                    width: '100%', padding: '10px 12px 10px 36px', borderRadius: 10,
                    border: `1px solid ${C.border}`, background: C.bg, color: C.text,
                    fontSize: 14, outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => e.target.style.borderColor = C.accent}
                  onBlur={(e) => e.target.style.borderColor = C.border}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: C.textMuted, marginBottom: 6 }}>
                Senha
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color={C.textDim} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%', padding: '10px 12px 10px 36px', borderRadius: 10,
                    border: `1px solid ${C.border}`, background: C.bg, color: C.text,
                    fontSize: 14, outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => e.target.style.borderColor = C.accent}
                  onBlur={(e) => e.target.style.borderColor = C.border}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '11px 0', borderRadius: 10, border: 'none',
                background: loading ? C.accentDim : `linear-gradient(135deg, ${C.accent}, ${C.accentDim})`,
                color: '#fff', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 4px 16px rgba(16,185,129,0.3)',
                opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s',
              }}
            >
              {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: C.textDim, marginTop: 24 }}>
          Clickmail v0.1.0
        </p>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        ::placeholder { color: ${C.textDim}; }
      `}</style>
    </div>
  )
}
