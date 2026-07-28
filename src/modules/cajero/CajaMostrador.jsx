import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import PanelCajaDiaria from '../caja/PanelCajaDiaria'

export default function CajaMostrador() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-fondo p-4 pb-10">
      <button onClick={() => navigate('/cajero')} className="mb-4 flex items-center gap-2 text-lg text-marca">
        <ArrowLeft size={24} /> Volver
      </button>

      <PanelCajaDiaria />
    </div>
  )
}
