import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { obtenerProductosConStock } from '../../lib/productos'
import { obtenerMovimientosCaja, totalesPorMedio } from '../../lib/caja'
import { traducirError } from '../../lib/errores'
import { formatearMoneda } from '../../lib/formato'
import { UNIDADES, etiquetaCantidadUnidad } from '../../lib/constantes'

const ETIQUETA_MEDIO = { efectivo: 'Efectivo', mercado_pago: 'Mercado Pago', transferencia: 'Transferencia' }

// remitosConDiferencia / pedidosPendientes vienen de `contadores` (prop desde
// AppRouter, fn_contadores_notificaciones) — ya centralizados y con refresco
// periódico, no se recalculan acá para no mostrar un número desincronizado
// del badge del sidebar. pedidosHoy sí es un KPI propio del dashboard, sin
// equivalente en esa RPC.
export default function DashboardDueno({ contadores = {} }) {
  const [kpis, setKpis] = useState(null)
  const [error, setError] = useState(null)
  const [cajaExpandida, setCajaExpandida] = useState(false)

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
        setKpis({ totalCajaHoy, totalesPorMedio: totales, pedidosHoy: pedidosHoy || 0, productosBajoMinimo })
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

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <button
          type="button"
          onClick={() => setCajaExpandida((v) => !v)}
          className="rounded-xl bg-marca p-4 text-left text-white shadow-sm transition-colors hover:bg-marca/90"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-white/70">Caja de hoy</p>
            {cajaExpandida ? <ChevronDown size={14} className="text-white/50" /> : <ChevronRight size={14} className="text-white/50" />}
          </div>
          <p className="font-mono text-2xl">{formatearMoneda(kpis.totalCajaHoy)}</p>
          {cajaExpandida && (
            <div className="mt-2 flex flex-col gap-1 border-t border-white/20 pt-2 text-xs text-white/80">
              {Object.entries(ETIQUETA_MEDIO).map(([medio, etiqueta]) => (
                <div key={medio} className="flex justify-between">
                  <span>{etiqueta}</span>
                  <span className="font-mono">{formatearMoneda(kpis.totalesPorMedio[medio] || 0)}</span>
                </div>
              ))}
            </div>
          )}
        </button>

        <Link to="/dueno/pedidos" className="rounded-xl bg-white p-4 shadow-sm hover:bg-marca/5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-marca/50">Pedidos de hoy</p>
            <ChevronRight size={14} className="text-marca/30" />
          </div>
          <p className="font-mono text-2xl text-marca">{kpis.pedidosHoy}</p>
        </Link>

        <Link
          to="/dueno/reporte-stock"
          state={{ productoIds: kpis.productosBajoMinimo.map((p) => p.id) }}
          className="rounded-xl bg-white p-4 shadow-sm hover:bg-marca/5"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-marca/50">Productos con stock bajo</p>
            <ChevronRight size={14} className="text-marca/30" />
          </div>
          <p className="font-mono text-2xl text-perdida">{kpis.productosBajoMinimo.length}</p>
        </Link>

        <Link to="/dueno/transferencias" className="rounded-xl bg-white p-4 shadow-sm hover:bg-marca/5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-marca/50">Remitos con diferencia sin revisar</p>
            <ChevronRight size={14} className="text-marca/30" />
          </div>
          <p className={`font-mono text-2xl ${contadores.remitos_con_diferencia > 0 ? 'text-perdida' : 'text-marca'}`}>
            {contadores.remitos_con_diferencia || 0}
          </p>
        </Link>

        <Link to="/dueno/pedidos" className="rounded-xl bg-white p-4 shadow-sm hover:bg-marca/5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-marca/50">Pedidos pendientes de confirmar</p>
            <ChevronRight size={14} className="text-marca/30" />
          </div>
          <p className={`font-mono text-2xl ${contadores.pedidos_pendientes > 0 ? 'text-perdida' : 'text-marca'}`}>
            {contadores.pedidos_pendientes || 0}
          </p>
        </Link>
      </div>

      {kpis.productosBajoMinimo.length > 0 && (
        <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-medium text-marca">Alertas de stock</h2>
          <ul className="text-sm text-marca/70">
            {kpis.productosBajoMinimo.map((p) => (
              <li key={p.id}>
                {p.nombre}: {etiquetaCantidadUnidad(p.stock_maple, p.es_huevo === false ? p.unidad_base : UNIDADES.MAPLE)}{' '}
                (mínimo {etiquetaCantidadUnidad(p.stock_minimo_maple, p.es_huevo === false ? p.unidad_base : UNIDADES.MAPLE)})
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
          { to: '/dueno/clientes-gestion', label: 'Clientes' },
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
