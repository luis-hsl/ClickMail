import { useState } from 'react'
import { Globe, Plus, CheckCircle, XCircle, AlertCircle, Shield } from 'lucide-react'

export default function Domains() {
  const [domains, setDomains] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [newDomain, setNewDomain] = useState('')

  const handleAddDomain = (e) => {
    e.preventDefault()
    // TODO: Integrar com Supabase
    console.log('Adicionar domínio:', newDomain)
    setShowAdd(false)
    setNewDomain('')
  }

  const StatusIcon = ({ configured }) =>
    configured ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    )

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Domínios</h1>
          <p className="text-gray-500 mt-1">Gerencie a autenticação DNS dos seus domínios</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Adicionar Domínio
        </button>
      </div>

      {/* Add domain modal */}
      {showAdd && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Novo Domínio</h3>
          <form onSubmit={handleAddDomain} className="flex gap-3">
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="ex: previsao.io"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
            />
            <button
              type="submit"
              className="bg-brand-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-700"
            >
              Adicionar
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg text-sm hover:bg-gray-50"
            >
              Cancelar
            </button>
          </form>
        </div>
      )}

      {/* DNS verification guide */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-6 h-6 text-brand-600" />
          <h3 className="text-lg font-semibold">Verificações DNS necessárias</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-gray-100 rounded-lg p-4">
            <p className="font-medium text-gray-900 mb-1">SPF</p>
            <p className="text-sm text-gray-500">Define quais servidores podem enviar em nome do domínio</p>
            <code className="block mt-2 text-xs bg-gray-50 p-2 rounded text-gray-700 break-all">
              v=spf1 include:amazonses.com ~all
            </code>
          </div>
          <div className="border border-gray-100 rounded-lg p-4">
            <p className="font-medium text-gray-900 mb-1">DKIM</p>
            <p className="text-sm text-gray-500">Assinatura criptográfica que prova autenticidade do email</p>
            <p className="mt-2 text-xs text-gray-400">3 registros CNAME gerados pelo Amazon SES</p>
          </div>
          <div className="border border-gray-100 rounded-lg p-4">
            <p className="font-medium text-gray-900 mb-1">DMARC</p>
            <p className="text-sm text-gray-500">Política de rejeição quando SPF/DKIM falham</p>
            <code className="block mt-2 text-xs bg-gray-50 p-2 rounded text-gray-700 break-all">
              v=DMARC1; p=quarantine; rua=mailto:dmarc@seudominio.com
            </code>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {domains.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Globe className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum domínio configurado</h3>
          <p className="text-gray-500">Adicione seu primeiro domínio para começar a configurar SPF, DKIM e DMARC.</p>
        </div>
      )}
    </div>
  )
}
