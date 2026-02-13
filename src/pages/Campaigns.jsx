import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Send, Clock, CheckCircle, Pause, AlertTriangle } from 'lucide-react'

const statusConfig = {
  draft: { label: 'Rascunho', color: 'text-gray-600', bg: 'bg-gray-100', icon: Clock },
  scheduled: { label: 'Agendada', color: 'text-blue-600', bg: 'bg-blue-100', icon: Clock },
  warming_up: { label: 'Aquecendo', color: 'text-amber-600', bg: 'bg-amber-100', icon: AlertTriangle },
  sending: { label: 'Enviando', color: 'text-green-600', bg: 'bg-green-100', icon: Send },
  paused: { label: 'Pausada', color: 'text-gray-600', bg: 'bg-gray-100', icon: Pause },
  completed: { label: 'Concluída', color: 'text-brand-600', bg: 'bg-brand-100', icon: CheckCircle },
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([])

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campanhas</h1>
          <p className="text-gray-500 mt-1">Crie e gerencie seus disparos de email</p>
        </div>
        <button className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
          <Plus className="w-4 h-4" />
          Nova Campanha
        </button>
      </div>

      {/* Campaign flow guide */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Fluxo de uma campanha</h3>
        <div className="flex items-center gap-2 text-sm">
          {[
            'Selecionar domínio + lista',
            'Definir remetente',
            'IA gera 5 variações',
            'Calcular spam score',
            'Configurar aquecimento',
            'Disparar',
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold">
                {i + 1}
              </span>
              <span className="text-gray-600 whitespace-nowrap">{step}</span>
              {i < 5 && <span className="text-gray-300">→</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {campaigns.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Send className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma campanha criada</h3>
          <p className="text-gray-500">Configure um domínio e importe uma lista antes de criar sua primeira campanha.</p>
        </div>
      )}
    </div>
  )
}
