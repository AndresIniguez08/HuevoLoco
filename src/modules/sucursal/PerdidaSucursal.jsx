import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import RegistrarPerdida from '../stock/RegistrarPerdida'

export default function PerdidaSucursal() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-fondo p-4 pb-10">
      <button onClick={() => navigate('/sucursal/stock')} className="mb-4 flex items-center gap-2 text-lg text-marca">
        <ArrowLeft size={24} /> Volver
      </button>
      <RegistrarPerdida />
    </div>
  )
}
