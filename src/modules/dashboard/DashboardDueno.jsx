import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { obtenerProductosConStock } from '../../lib/productos'
import { obtenerMovimientosCaja, totalesPorMedio } from '../../lib/caja'
import { traducirError } from '../../lib/errores'

export default function DashboardDueno() {
  const [kpis, setKpis] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function cargar() {
      try {
        const hoy = new Date().toISOString().slice(0, 10)
        const [productos, movimientosCaja, { count: pedidosHoy }] = await Promise.all([
          obtenerProductosConStock(),
          obtenerMovimientosCaja(),
          supabase
            .from('pedidos')
            .select('*', { count: 'exact', head: true })
            .gte('creado_at', `${hoy}T00:00:00`),
        ])
        const totales = totalesPorMedio(movimientosCaja)
        const totalCajaHoy = Object.values(totales).reduce((a, b) => a + b, 0)
        const productosBajoMinimo = productos.filter(
          (p) => p.stock_minimo_maple != null && p.stock_maple < p.stock_minimo_maple
        )
        setKpis({ totalCajaHoy, pedidosHoy: pedidosHoy || 0, productosBajoMinimo })
      } catch (e) {
        setError(traducirError(e))
      }
    }
    cargar()
  }, [])

  if (error) return <p className="text-perdida">{error}</p>
  if (!kpis) return <p className="text-marca/60">Cargando dashboard...</p>

  return (
    <div>
      <h1 className="mb-4 font-display text-xl text-marca">Dashboard</h1>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-marca p-4 text-white shadow-sm">
          <p className="text-xs text-white/70">Caja de hoy</p>
          <p className="font-mono text-2xl">${kpis.totalCajaHoy.toFixed(2)}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs text-marca/50">Pedidos de hoy</p>
          <p className="font-mono text-2xl text-marca">{kpis.pedidosHoy}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs text-marca/50">Productos con stock bajo</p>
          <p className="font-mono text-2xl text-perdida">{kpis.productosBajoMinimo.length}</p>
        </div>
      </div>

      {kpis.productosBajoMinimo.length > 0 && (
        <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-medium text-marca">Alertas de stock</h2>
          <ul className="text-sm text-marca/70">
            {kpis.productosBajoMinimo.map((p) => (
              <li key={p.id}>
                {p.nombre}: {p.stock_maple} maples (mínimo {p.stock_minimo_maple})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { to: '/dueno/stock', label: 'Stock' },
          { to: '/dueno/ventas', label: 'Tomar pedido' },
          { to: '/dueno/pedidos', label: 'Pedidos' },
          { to: '/dueno/caja', label: 'Caja' },
          { to: '/dueno/compras', label: 'Compras' },
          { to: '/dueno/perdidas', label: 'Pérdidas' },
          { to: '/dueno/reparto', label: 'Reparto' },
          { to: '/dueno/clientes', label: 'Clientes' },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="rounded-xl bg-white p-4 text-center text-sm font-medium text-marca shadow-sm hover:bg-marca/5"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
