import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { obtenerStockDesglose } from '../../lib/productos'
import { traducirError } from '../../lib/errores'
import GrillaCajon from '../../components/GrillaCajon'
import Badge from '../../components/ui/Badge'

export default function StockActual() {
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setCargando(true)
    try {
      const data = await obtenerStockDesglose()
      setProductos(data)
      setError(null)
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setCargando(false)
    }
  }

  if (cargando) return <p className="text-marca/60">Cargando stock...</p>
  if (error) return <p className="text-perdida">{error}</p>

  return (
    <div>
      <h1 className="mb-4 font-display text-xl text-marca">Stock actual</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {productos.map((p) => {
          const bajoMinimo = p.minimo_cajones != null && p.cajones < p.minimo_cajones
          return (
            <div key={p.producto_id} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-start justify-between">
                <h2 className="font-medium text-marca">{p.nombre}</h2>
                {bajoMinimo && (
                  <Badge tono="alerta">
                    <AlertTriangle size={12} className="mr-1 inline" />
                    Stock bajo
                  </Badge>
                )}
              </div>
              <div className="mb-3 flex items-baseline gap-4">
                <p className="font-mono text-2xl text-yema">
                  {p.cajones} <span className="text-sm text-marca/50">cajones</span>
                </p>
                <p className="font-mono text-2xl text-yema">
                  {p.cajas} <span className="text-sm text-marca/50">cajas</span>
                </p>
              </div>
              <GrillaCajon stockMaple={p.maples_sueltos} />
              {p.minimo_cajones != null && (
                <p className="mt-3 text-xs text-marca/50">Mínimo: {p.minimo_cajones} cajones</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
