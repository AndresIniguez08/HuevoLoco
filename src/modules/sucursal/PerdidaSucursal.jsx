import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import RegistrarPerdida from '../stock/RegistrarPerdida'

export default function PerdidaSucursal() {
  const navigate = useNavigate()
  const perfil = useAuthStore((s) => s.perfil)

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-fondo p-4 pb-10">
      <button onClick={() => navigate('/sucursal/stock')} className="mb-4 flex items-center gap-2 text-lg text-marca">
        <ArrowLeft size={24} /> Volver
      </button>
      <RegistrarPerdida sucursalId={perfil?.sucursal_id} />
    </div>
  )
}
