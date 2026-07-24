import { useEffect, useState } from 'react'
import { obtenerStockDesgloseSucursal } from '../../lib/productos'
import { traducirError } from '../../lib/errores'
import { useAuthStore } from '../../stores/authStore'

export default function ReporteStock() {
  const perfil = useAuthStore((s) => s.perfil)
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

  return (
    <div>
      <h1 className="mb-4 font-display text-xl text-marca">Reporte de stock</h1>
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
            {productos.map((p) => (
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
    </div>
  )
}
