import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, ClipboardList, FileText, PackageMinus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { obtenerStockGeneralPorSucursal } from '../../lib/productos'
import { listarSucursales } from '../../lib/transferencias'
import { traducirError } from '../../lib/errores'
import { useAuthStore } from '../../stores/authStore'
import { ROLES, etiquetaCantidadUnidad } from '../../lib/constantes'
import BotonVolverInicio from '../../components/BotonVolverInicio'
import GrillaCajon from '../../components/GrillaCajon'
import Badge from '../../components/ui/Badge'

function TarjetaProducto({ p }) {
  const esHuevo = p.es_huevo !== false
  if (esHuevo) {
    const desglose = p.desglose
    const cajones = desglose?.cajones ?? 0
    const cajas = desglose?.cajas ?? 0
    const maplesSueltos = desglose?.maples_sueltos ?? 0
    const minimoCajones = desglose?.minimo_cajones ?? null
    const bajoMinimo = minimoCajones != null && cajones < minimoCajones
    return (
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-start justify-between">
          <h3 className="font-medium text-marca">{p.nombre}</h3>
          {bajoMinimo && (
            <Badge tono="alerta">
              <AlertTriangle size={12} className="mr-1 inline" />
              Stock bajo
            </Badge>
          )}
        </div>
        <div className="mb-3 flex items-baseline gap-4">
          <p className="font-mono text-2xl text-yema">
            {cajones} <span className="text-sm text-marca/50">cajones</span>
          </p>
          <p className="font-mono text-2xl text-yema">
            {cajas} <span className="text-sm text-marca/50">cajas</span>
          </p>
        </div>
        <GrillaCajon stockMaple={maplesSueltos} />
        {minimoCajones != null && <p className="mt-3 text-xs text-marca/50">Mínimo: {minimoCajones} cajones</p>}
      </div>
    )
  }

  const bajoMinimo = p.stock_minimo_maple != null && p.stock_maple < p.stock_minimo_maple
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between">
        <h3 className="font-medium text-marca">{p.nombre}</h3>
        {bajoMinimo && (
          <Badge tono="alerta">
            <AlertTriangle size={12} className="mr-1 inline" />
            Stock bajo
          </Badge>
        )}
      </div>
      <p className="font-mono text-2xl text-yema">{etiquetaCantidadUnidad(p.stock_maple, p.unidad_base)}</p>
      {p.stock_minimo_maple != null && (
        <p className="mt-3 text-xs text-marca/50">Mínimo: {etiquetaCantidadUnidad(p.stock_minimo_maple, p.unidad_base)}</p>
      )}
    </div>
  )
}

function GrillaProductos({ productos }) {
  if (productos.length === 0) {
    return <p className="text-sm text-marca/50">No hay productos con stock acá.</p>
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {productos.map((p) => (
        <TarjetaProducto key={p.id} p={p} />
      ))}
    </div>
  )
}

function ordenarPorNombre(productos) {
  return [...productos].sort((a, b) => a.nombre.localeCompare(b.nombre))
}

export default function StockGeneral() {
  const perfil = useAuthStore((s) => s.perfil)
  const navigate = useNavigate()
  // Depósito llega acá desde su pantalla de inicio simplificada (sin
  // sidebar) — se le agregan los accesos a Control de stock/Reportar
  // pérdida acá mismo, mismo patrón que StockSucursal.jsx agrupando
  // acciones relacionadas en una sola pantalla. Dueño/admin ya los tienen
  // como ítems propios del sidebar, no hace falta duplicarlos para ellos.
  const esDeposito = perfil?.rol === ROLES.DEPOSITO
  // Solo dueño/administrativo ven stock de más de una sucursal — depósito
  // sigue viendo únicamente el de Casa Central (su propio perfil.sucursal_id),
  // sin selector, igual que siempre.
  const puedeFiltrarSucursal = perfil?.rol === ROLES.DUENO || perfil?.rol === ROLES.ADMINISTRATIVO

  const [sucursales, setSucursales] = useState([])
  // '' = "Todas" (agrupado). Solo relevante si puedeFiltrarSucursal.
  const [sucursalFiltro, setSucursalFiltro] = useState('')
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (puedeFiltrarSucursal) listarSucursales().then(setSucursales).catch(() => {})
  }, [puedeFiltrarSucursal])

  const cargar = useCallback(async () => {
    if (!perfil?.sucursal_id) return
    setCargando(true)
    try {
      // Depósito: siempre su propia sucursal (Central), como antes. Dueño/
      // admin: la que hayan elegido, o null ("Todas") para traer todo junto.
      const idParaConsulta = puedeFiltrarSucursal ? sucursalFiltro || null : perfil.sucursal_id
      const data = await obtenerStockGeneralPorSucursal(idParaConsulta)
      setProductos(data)
      setError(null)
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setCargando(false)
    }
  }, [perfil?.sucursal_id, puedeFiltrarSucursal, sucursalFiltro])

  useEffect(() => {
    cargar()
  }, [cargar])

  const mostrandoTodas = puedeFiltrarSucursal && sucursalFiltro === ''

  return (
    <div>
      <BotonVolverInicio />
      <h1 className="mb-4 font-display text-xl text-marca">Stock actual</h1>

      {puedeFiltrarSucursal && (
        <label className="mb-4 flex flex-col gap-1 text-sm">
          <span className="font-medium text-marca">Sucursal</span>
          <select
            value={sucursalFiltro}
            onChange={(e) => setSucursalFiltro(e.target.value)}
            className="w-full max-w-xs rounded-lg border border-marca/20 px-3 py-2 outline-none focus:border-marca-claro sm:w-auto"
          >
            <option value="">Todas</option>
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </label>
      )}

      {esDeposito && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => navigate('/deposito/reporte-stock')}
            className="flex min-h-[56px] w-full flex-1 items-center justify-center gap-2 rounded-xl border border-marca-claro text-base font-medium text-marca-claro"
          >
            <FileText size={20} /> Reporte de stock
          </button>
          <button
            onClick={() => navigate('/deposito/conteo')}
            className="flex min-h-[56px] w-full flex-1 items-center justify-center gap-2 rounded-xl border border-marca-claro text-base font-medium text-marca-claro"
          >
            <ClipboardList size={20} /> Control de stock
          </button>
          <button
            onClick={() => navigate('/deposito/perdidas')}
            className="flex min-h-[56px] w-full flex-1 items-center justify-center gap-2 rounded-xl border border-perdida text-base font-medium text-perdida"
          >
            <PackageMinus size={20} /> Reportar pérdida
          </button>
        </div>
      )}

      {cargando ? (
        <p className="text-marca/60">Cargando stock...</p>
      ) : error ? (
        <p className="text-perdida">{error}</p>
      ) : mostrandoTodas ? (
        <div className="flex flex-col gap-6">
          {sucursales.map((s) => (
            <div key={s.id}>
              <h2 className="mb-3 font-display text-lg text-marca">{s.nombre}</h2>
              <GrillaProductos productos={ordenarPorNombre(productos.filter((p) => p.sucursal_id === s.id))} />
            </div>
          ))}
        </div>
      ) : (
        <GrillaProductos productos={ordenarPorNombre(productos)} />
      )}
    </div>
  )
}
