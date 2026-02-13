import { Component } from 'react'
import { C } from '@/theme/colors'
import { AlertOctagon, RefreshCw } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '60vh', padding: 40, textAlign: 'center',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, background: C.dangerBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
          }}>
            <AlertOctagon size={30} color={C.danger} />
          </div>
          <h2 style={{ color: C.text, fontSize: 20, fontWeight: 600, margin: 0, marginBottom: 8 }}>
            Algo deu errado
          </h2>
          <p style={{ color: C.textDim, fontSize: 14, margin: 0, marginBottom: 24, maxWidth: 400, lineHeight: 1.5 }}>
            Ocorreu um erro inesperado. Tente recarregar a página.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.reload()
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px',
              borderRadius: 10, border: 'none', background: C.accent, color: '#fff',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <RefreshCw size={16} />
            Recarregar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
