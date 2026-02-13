import { useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function CampaignDetail() {
  const { id } = useParams()

  return (
    <div>
      <Link to="/campaigns" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" />
        Voltar para campanhas
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Detalhes da Campanha</h1>
      <p className="text-gray-500">ID: {id}</p>

      {/* TODO: Campaign details, variants, warmup schedule, send logs */}
      <div className="mt-8 bg-white rounded-xl border border-gray-200 p-12 text-center">
        <p className="text-gray-500">Detalhes da campanha serão exibidos aqui.</p>
      </div>
    </div>
  )
}
