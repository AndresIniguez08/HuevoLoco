import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, LogOut, ShoppingCart, Wallet } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import Modal from '../../components/ui/Modal'
import VentaMostrador from './VentaMostrador'

export default function InicioCajero() {
  const perfil = useAuthStore((s) => s.perfil)
  const cerrarSesion = useAuthStore((s) => s.cerrarSesion)
  const navigate = useNavigate()
  const [ventaAbierta, setVentaAbierta] = useState(false)

  return (
    <div className="min-h-screen bg-fondo pb-10">
      <header className="flex items-center justify-between bg-marca px-4 py-4 text-white">
        <div>
          <p className="font-display text-lg leading-none">Huevo Loco</p>
          <p className="text-sm text-white/70">{perfil?.nombre}</p>
        </div>
        <button onClick={cerrarSesion} className="rounded-lg p-2 hover:bg-white/10" aria-label="Salir">
          <LogOut size={22} />
        </button>
      </header>

      <div className="mx-auto grid max-w-xl grid-cols-1 gap-4 p-4 sm:grid-cols-2">
        <button
          onClick={() => setVentaAbierta(true)}
          className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-2xl bg-marca px-3 text-xl font-medium text-white shadow-sm active:opacity-90"
        >
          <ShoppingCart size={32} />
          Vender
        </button>
        <button
          onClick={() => navigate('/cajero/caja')}
          className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-2xl bg-marca-claro px-3 text-xl font-medium text-white shadow-sm active:opacity-90"
        >
          <Wallet size={32} />
          Caja
        </button>
        <button
          onClick={() => navigate('/cajero/mis-ventas')}
          className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-2xl bg-fresco px-3 text-xl font-medium text-white shadow-sm active:opacity-90"
        >
          <ClipboardList size={32} />
          Mis ventas de hoy
        </button>
      </div>

      <Modal abierto={ventaAbierta} onCerrar={() => setVentaAbierta(false)} titulo="Vender" ancho="max-w-2xl">
        <VentaMostrador />
      </Modal>
    </div>
  )
}
