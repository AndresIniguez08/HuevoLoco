import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { listarSucursales, configurarCCSucursal, obtenerResumenSucursales } from '../../lib/transferencias'
import { traducirError } from '../../lib/errores'
import { useAuthStore } from '../../stores/authStore'
import { ROLES } from '../../lib/constantes'
import Button from '../../components/ui/Button'
import Toggle from '../../components/ui/Toggle'
import Modal from '../../components/ui/Modal'
import { formatearMoneda, formatearNumero } from '../../lib/formato'
import { PERIODOS } from '../../lib/periodos'

const COLOR_BARRA = '#0B2D5B'

function useEsMovil() {
  const [esMovil, setEsMovil] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    function onResize() {
      setEsMovil(window.innerWidth < 640)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return esMovil
}

function TooltipFacturacion({ active, payload }) {
  if (!active || !payload?.length) return null
  const item = payload[0].payload
  return (
    <div className="rounded-lg border border-marca/10 bg-white px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-marca">{item.nombre}</p>
      <p className="font-mono text-marca/70">{formatearMoneda(item.facturacion_total)}</p>
    </div>
  )
}

function TarjetaResumen({ r, esDueno }) {
  const deuda = Number(r.deuda_total) || 0
  return (
    <div className="rounded-xl bg-marca/5 p-4">
      <h3 className="mb-3 font-medium text-marca">{r.nombre}</h3>
      <div className="flex flex-col gap-3 text-sm">
        <div>
          <p className="text-xs text-marca/50">Facturación total</p>
          <p className="font-mono text-lg text-marca">{formatearMoneda(r.facturacion_total)}</p>
        </div>
        <div>
          <p className="text-xs text-marca/50">Cantidad de ventas</p>
          <p className="font-mono text-marca">{r.cantidad_ventas ?? 0}</p>
        </div>
        <div>
          <p className="text-xs text-marca/50">Deuda total de clientes</p>
          <p className={`font-mono ${deuda > 0 ? 'text-perdida' : 'text-marca'}`}>{formatearMoneda(deuda)}</p>
        </div>
        {esDueno && (
          <div>
            <p className="text-xs text-marca/50">Valor de stock</p>
            <p className="font-mono text-marca">{formatearMoneda(r.valor_stock)}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function ModalResumenSucursales({ abierto, onCerrar, esDueno }) {
  const [resumen, setResumen] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [periodoId, setPeriodoId] = useState('general')
  const esMovil = useEsMovil()
  const periodo = PERIODOS.find((p) => p.id === periodoId)

  useEffect(() => {
    if (!abierto) return
    setCargando(true)
    const { desde, hasta } = periodo.rango()
    obtenerResumenSucursales(desde ? desde.toISOString() : null, hasta ? hasta.toISOString() : null)
      .then(setResumen)
      .catch((e) => setError(traducirError(e)))
      .finally(() => setCargando(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, periodoId])

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Resumen por sucursal" ancho="max-w-4xl">
      <p className="mb-4 text-xs text-marca/50">
        Facturación y ventas de: {periodo.label} — Deuda y stock: al día de hoy
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {PERIODOS.map((p) => (
          <Button
            key={p.id}
            type="button"
            tamano="sm"
            variante={p.id === periodoId ? 'primario' : 'secundario'}
            onClick={() => setPeriodoId(p.id)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {cargando ? (
        <p className="text-sm text-marca/60">Cargando resumen...</p>
      ) : error ? (
        <p className="text-sm text-perdida">{error}</p>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {resumen.map((r) => (
              <TarjetaResumen key={r.sucursal_id || r.nombre} r={r} esDueno={esDueno} />
            ))}
          </div>

          {resumen.length > 0 && (
            // min-w-0 es necesario: este div es un ítem de un contenedor flex
            // (flex flex-col más arriba), y por defecto un ítem flex no se
            // achica por debajo del ancho de su contenido aunque tenga
            // width: 100% — eso es lo que hacía que el SVG del gráfico se
            // saliera del modal en pantallas angostas (eje Y cortado y barras
            // "sueltas" fuera del contenedor).
            <div className="min-w-0 overflow-hidden" style={{ width: '100%', height: esMovil ? 220 : 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={resumen}
                  margin={{ top: 8, right: 8, left: esMovil ? -16 : 8, bottom: esMovil ? 20 : 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#0B2D5B1A" vertical={false} />
                  <XAxis
                    dataKey="nombre"
                    tick={{ fontSize: esMovil ? 10 : 12, fill: '#0B2D5B99' }}
                    axisLine={{ stroke: '#0B2D5B1A' }}
                    tickLine={false}
                    interval={0}
                    angle={esMovil ? -30 : 0}
                    textAnchor={esMovil ? 'end' : 'middle'}
                    height={esMovil ? 36 : 30}
                  />
                  <YAxis
                    tick={{ fontSize: esMovil ? 10 : 12, fill: '#0B2D5B99' }}
                    axisLine={false}
                    tickLine={false}
                    width={esMovil ? 46 : 60}
                    tickFormatter={(v) => `$${formatearNumero(v)}`}
                  />
                  <Tooltip content={<TooltipFacturacion />} cursor={{ fill: '#0B2D5B0D' }} />
                  <Bar dataKey="facturacion_total" fill={COLOR_BARRA} radius={[4, 4, 0, 0]} maxBarSize={esMovil ? 48 : 80} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

function TarjetaSucursal({ sucursal, onGuardado }) {
  const [habilitada, setHabilitada] = useState(!!sucursal.cc_habilitada_default)
  const [limite, setLimite] = useState(
    sucursal.limite_credito_default != null ? String(sucursal.limite_credito_default) : ''
  )
  const [sinGuardar, setSinGuardar] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  function alternar(valor) {
    setHabilitada(valor)
    setSinGuardar(true)
  }

  function cambiarLimite(valor) {
    setLimite(valor)
    setSinGuardar(true)
  }

  async function guardar() {
    setGuardando(true)
    setError(null)
    try {
      await configurarCCSucursal(sucursal.id, habilitada, Number(limite) || 0)
      setSinGuardar(false)
      onGuardado()
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <h2 className="mb-3 font-medium text-marca">{sucursal.nombre}</h2>

      <div className="mb-3 flex items-center justify-between gap-4">
        <span className="text-sm text-marca/70">Activar cuenta corriente para esta sucursal</span>
        <Toggle checked={habilitada} onChange={alternar} />
      </div>

      <label className="mb-3 flex flex-col gap-1 text-sm">
        <span className="font-medium text-marca">Disponible por cliente</span>
        <input
          type="number"
          min="0"
          step="0.01"
          disabled={!habilitada}
          value={limite}
          onChange={(e) => cambiarLimite(e.target.value)}
          className="w-40 rounded-lg border border-marca/20 px-3 py-2 font-mono outline-none focus:border-marca-claro disabled:bg-marca/5 disabled:text-marca/40"
        />
      </label>
      <p className="mb-3 text-xs text-marca/50">
        Límite que aplica a los clientes de esta sucursal que no tengan un límite propio distinto.
      </p>

      {error && <p className="mb-2 text-sm text-perdida">{error}</p>}

      <Button tamano="sm" cargando={guardando} disabled={!sinGuardar} onClick={guardar}>
        Guardar
      </Button>
    </div>
  )
}

export default function GestionSucursales() {
  const perfil = useAuthStore((s) => s.perfil)
  const esDueno = perfil?.rol === ROLES.DUENO
  const puedeVerResumen = esDueno || perfil?.rol === ROLES.ADMINISTRATIVO
  const [sucursales, setSucursales] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [resumenAbierto, setResumenAbierto] = useState(false)

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setCargando(true)
    try {
      const data = await listarSucursales()
      // Casa Central no maneja cuenta corriente "por sucursal": dueño/admin
      // ya autorizan cliente por cliente ahí, como siempre.
      setSucursales(data.filter((s) => s.nombre !== 'Casa Central'))
      setError(null)
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h1 className="font-display text-xl text-marca">Sucursales</h1>
        {puedeVerResumen && (
          <Button tamano="sm" variante="secundario" onClick={() => setResumenAbierto(true)}>
            Ver resumen por sucursal
          </Button>
        )}
      </div>
      <p className="mb-4 text-sm text-marca/60">
        Cuenta corriente general por sucursal: si está activada, sus clientes pueden confirmar pedidos a crédito hasta
        el límite de acá sin necesitar autorización individual.
      </p>

      {error && <p className="mb-3 text-sm text-perdida">{error}</p>}

      {cargando ? (
        <p className="text-sm text-marca/60">Cargando sucursales...</p>
      ) : sucursales.length === 0 ? (
        <p className="text-sm text-marca/50">No hay sucursales para configurar (aparte de Casa Central).</p>
      ) : (
        <div className="flex flex-col gap-4">
          {sucursales.map((s) => (
            <TarjetaSucursal key={s.id} sucursal={s} onGuardado={cargar} />
          ))}
        </div>
      )}

      {puedeVerResumen && (
        <ModalResumenSucursales abierto={resumenAbierto} onCerrar={() => setResumenAbierto(false)} esDueno={esDueno} />
      )}
    </div>
  )
}
