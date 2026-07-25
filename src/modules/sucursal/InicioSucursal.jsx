import { LogOut, PackageCheck, PackageSearch, ShoppingCart, Wallet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import BadgeContador from '../../components/ui/BadgeContador'

const BOTONES = [
  { to: '/sucursal/vender', label: 'Vender', icono: ShoppingCart, clase: 'bg-marca' },
  { to: '/sucursal/aceptar-mercaderia', label: 'Aceptar mercadería', icono: PackageCheck, clase: 'bg-fresco' },
  { to: '/sucursal/stock', label: 'Stock', icono: PackageSearch, clase: 'bg-yema' },
  { to: '/sucursal/caja', label: 'Caja', icono: Wallet, clase: 'bg-marca-claro' },
]

export default function InicioSucursal({ contadorAceptarMercaderia }) {
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

      <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
        {BOTONES.map((b) => {
          const contador = b.to === '/sucursal/aceptar-mercaderia' ? contadorAceptarMercaderia : null
          return (
            <button
              key={b.to}
              onClick={() => navigate(b.to)}
              className={`relative flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-2xl px-3 text-xl font-medium text-white shadow-sm active:opacity-90 ${b.clase}`}
            >
              {contador > 0 && (
                <span className="absolute right-3 top-3">
                  <BadgeContador valor={contador} />
                </span>
              )}
              <b.icono size={32} />
              {b.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
