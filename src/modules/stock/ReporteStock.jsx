import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { obtenerStockDesgloseSucursal } from '../../lib/productos'
import { traducirError } from '../../lib/errores'
import { useAuthStore } from '../../stores/authStore'
import BotonVolverInicio from '../../components/BotonVolverInicio'

export default function ReporteStock() {
  const perfil = useAuthStore((s) => s.perfil)
  const location = useLocation()
  const navigate = useNavigate()
  // El Dashboard puede navegar acá pasando los ids de "Productos con stock
  // bajo" (mismo cálculo que la tarjeta, en stock_maple/stock_minimo_maple)
  // — se filtra por id en vez de recalcular "bajo mínimo" con los campos de
  // stock_desglose (cajones/minimo_cajones), que son una unidad distinta.
  const filtroIds = location.state?.productoIds || null
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

  if (cargando) return <p className="text-marca/60">Cargando reporte...</p>
  if (error) return <p className="text-perdida">{error}</p>

  const productosFiltrados = filtroIds ? productos.filter((p) => filtroIds.includes(p.producto_id)) : productos

  return (
    <div>
      <BotonVolverInicio />
      <h1 className="mb-4 font-display text-xl text-marca">Reporte de stock</h1>

      {filtroIds && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-yema/15 p-3 text-sm text-marca">
          <span>Mostrando solo productos con stock bajo ({productosFiltrados.length})</span>
          <button
            onClick={() => navigate(location.pathname, { replace: true, state: null })}
            className="flex items-center gap-1 font-medium text-marca-claro"
          >
            <X size={14} /> Ver todo
          </button>
        </div>
      )}

      {productosFiltrados.length === 0 ? (
        <p className="text-sm text-marca/50">
          {filtroIds ? 'Ninguno de esos productos aparece en este reporte.' : 'No hay productos para mostrar.'}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-marca/10 text-marca/50">
                <th className="p-3 font-medium">Producto</th>
                <th className="p-3 font-medium">Cajones</th>
                <th className="p-3 font-medium">Cajas</th>
                <th className="p-3 font-medium">Maples sueltos</th>
                <th className="p-3 font-medium">Total en maples</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-marca/10">
              {productosFiltrados.map((p) => (
                <tr key={p.producto_id}>
                  <td className="p-3 font-medium text-marca">{p.nombre}</td>
                  <td className="p-3 font-mono">{p.cajones}</td>
                  <td className="p-3 font-mono">{p.cajas}</td>
                  <td className="p-3 font-mono">{p.maples_sueltos}</td>
                  <td className="p-3 font-mono">{p.stock_total_maple}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
