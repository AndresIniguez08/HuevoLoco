import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import PanelMisVentas from '../ventas/PanelMisVentas'

export default function MisVentas() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-fondo p-4 pb-10">
      <button onClick={() => navigate('/cajero')} className="mb-4 flex items-center gap-2 text-lg text-marca">
        <ArrowLeft size={24} /> Volver
      </button>
      <h1 className="mb-4 font-display text-2xl text-marca">Mis ventas</h1>

      <PanelMisVentas />
    </div>
  )
}
