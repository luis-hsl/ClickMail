import { Key, Cloud, Bot, Server } from 'lucide-react'

const integrations = [
  {
    name: 'Amazon SES',
    description: 'Serviço de disparo de emails',
    icon: Cloud,
    fields: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'],
    connected: false,
  },
  {
    name: 'MillionVerifier',
    description: 'Verificação de emails',
    icon: Key,
    fields: ['MILLIONVERIFIER_API_KEY'],
    connected: false,
  },
  {
    name: 'Claude API',
    description: 'Geração de variações por IA',
    icon: Bot,
    fields: ['ANTHROPIC_API_KEY'],
    connected: false,
  },
  {
    name: 'n8n',
    description: 'Automação de workflows',
    icon: Server,
    fields: ['N8N_WEBHOOK_BASE_URL'],
    connected: false,
  },
]

export default function Settings() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-500 mt-1">Gerencie integrações e preferências</p>
      </div>

      <div className="space-y-4">
        {integrations.map(({ name, description, icon: Icon, fields, connected }) => (
          <div key={name} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-gray-100 p-2.5 rounded-lg">
                  <Icon className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{name}</h3>
                  <p className="text-sm text-gray-500">{description}</p>
                </div>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                connected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {connected ? 'Conectado' : 'Não configurado'}
              </span>
            </div>

            <div className="space-y-2">
              {fields.map((field) => (
                <div key={field} className="flex items-center gap-3">
                  <label className="text-xs font-mono text-gray-500 w-56">{field}</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                  />
                </div>
              ))}
            </div>

            <button className="mt-4 text-sm font-medium text-brand-600 hover:text-brand-700">
              Salvar configuração
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
