import { useState, useRef } from 'react'
import { Upload, Users, CheckCircle, XCircle, AlertTriangle, FileSpreadsheet } from 'lucide-react'

export default function Lists() {
  const [lists, setLists] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef(null)

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith('.csv')) {
      handleFile(file)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) handleFile(file)
  }

  const handleFile = (file) => {
    // TODO: Parse CSV com PapaParse e enviar para Supabase
    console.log('Arquivo selecionado:', file.name, file.size)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Listas</h1>
          <p className="text-gray-500 mt-1">Importe e verifique suas bases de contatos</p>
        </div>
      </div>

      {/* Upload area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`bg-white rounded-xl border-2 border-dashed p-12 text-center cursor-pointer transition-colors mb-6 ${
          dragOver ? 'border-brand-500 bg-brand-50' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <Upload className={`w-10 h-10 mx-auto mb-3 ${dragOver ? 'text-brand-500' : 'text-gray-400'}`} />
        <p className="text-sm font-medium text-gray-900">
          Arraste um arquivo CSV aqui ou clique para selecionar
        </p>
        <p className="text-xs text-gray-500 mt-1">
          O CSV deve conter pelo menos uma coluna de "email"
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Verification stats legend */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        {[
          { icon: Users, label: 'Total', color: 'text-gray-600', bg: 'bg-gray-50' },
          { icon: CheckCircle, label: 'Válidos', color: 'text-green-600', bg: 'bg-green-50' },
          { icon: XCircle, label: 'Inválidos', color: 'text-red-600', bg: 'bg-red-50' },
          { icon: AlertTriangle, label: 'Risco', color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(({ icon: Icon, label, color, bg }) => (
          <div key={label} className={`${bg} rounded-lg p-3 flex items-center gap-2`}>
            <Icon className={`w-4 h-4 ${color}`} />
            <span className={`text-sm font-medium ${color}`}>{label}</span>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {lists.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileSpreadsheet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma lista importada</h3>
          <p className="text-gray-500">Faça upload de um CSV com sua base de emails para começar a verificação.</p>
        </div>
      )}
    </div>
  )
}
