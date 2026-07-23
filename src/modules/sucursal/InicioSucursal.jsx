import { LogOut, PackageCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

export default function InicioSucursal() {
  const perfil = useAuthStore((s) => s.perfil)
  const cerrarSesion = useAuthStore((s) => s.cerrarSesion)
  const navigate = useNavigate()

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

      <div className="flex flex-col gap-4 p-4">
        <button
          onClick={() => navigate('/sucursal/aceptar-mercaderia')}
          className="flex min-h-[80px] w-full items-center justify-center gap-3 rounded-2xl bg-fresco px-4 text-2xl font-medium text-white shadow-sm active:bg-fresco/90"
        >
          <PackageCheck size={32} />
          Aceptar mercadería
        </button>
      </div>
    </div>
  )
}
