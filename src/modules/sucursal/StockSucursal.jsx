import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, ClipboardList, PackageMinus } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { obtenerStockDesgloseSucursal } from '../../lib/productos'
import { traducirError } from '../../lib/errores'
import GrillaCajon from '../../components/GrillaCajon'
import Badge from '../../components/ui/Badge'

export default function StockSucursal() {
  const perfil = useAuthStore((s) => s.perfil)
  const navigate = useNavigate()

  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!perfil?.sucursal_id) return
    obtenerStockDesgloseSucursal(perfil.sucursal_id)
      .then(setProductos)
      .catch((e) => setError(traducirError(e)))
      .finally(() => setCargando(false))
  }, [perfil?.sucursal_id])

  return (
    <div className="min-h-screen bg-fondo p-4 pb-10">
      <button onClick={() => navigate('/sucursal')} className="mb-4 flex items-center gap-2 text-lg text-marca">
        <ArrowLeft size={24} /> Volver
      </button>
      <h1 className="mb-4 font-display text-2xl text-marca">Stock</h1>

      <div className="mb-4 flex flex-col gap-3">
        <button
          onClick={() => navigate('/sucursal/conteo')}
          className="flex min-h-[60px] w-full items-center justify-center gap-2 rounded-xl border border-marca-claro text-lg font-medium text-marca-claro"
        >
          <ClipboardList size={22} />
          Control de stock
        </button>
        <button
          onClick={() => navigate('/sucursal/perdidas')}
          className="flex min-h-[60px] w-full items-center justify-center gap-2 rounded-xl border border-perdida text-lg font-medium text-perdida"
        >
          <PackageMinus size={22} />
          Reportar pérdida
        </button>
      </div>

      {cargando ? (
        <p className="text-center text-lg text-marca/60">Cargando...</p>
      ) : error ? (
        <p className="text-center text-lg text-perdida">{error}</p>
      ) : productos.length === 0 ? (
        <p className="text-center text-lg text-marca/50">No hay productos habilitados en esta sucursal.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {productos.map((p) => {
            const bajoMinimo = p.minimo_cajones != null && p.cajones < p.minimo_cajones
            return (
              <div key={p.producto_id} className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-start justify-between">
                  <h2 className="text-xl font-medium text-marca">{p.nombre}</h2>
                  {bajoMinimo && (
                    <Badge tono="alerta">
                      <AlertTriangle size={12} className="mr-1 inline" />
                      Stock bajo
                    </Badge>
                  )}
                </div>
                <div className="mb-3 flex items-baseline gap-6">
                  <p className="font-mono text-3xl text-yema">
                    {p.cajones} <span className="text-base text-marca/50">cajones</span>
                  </p>
                  <p className="font-mono text-3xl text-yema">
                    {p.cajas} <span className="text-base text-marca/50">cajas</span>
                  </p>
                </div>
                <GrillaCajon stockMaple={p.maples_sueltos} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
