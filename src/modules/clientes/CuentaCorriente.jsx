import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { obtenerCliente, obtenerMovimientosCuentaCorriente, obtenerItemsPedido } from '../../lib/clientes'
import { obtenerSaldoCliente, obtenerDetallePago } from '../../lib/cobranzas'
import { traducirError } from '../../lib/errores'
import { MEDIOS_PAGO, ETIQUETA_UNIDAD } from '../../lib/constantes'
import { formatearMoneda } from '../../lib/formato'
import BuscadorCliente from '../../components/BuscadorCliente'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'

const ETIQUETA_MEDIO = Object.fromEntries(MEDIOS_PAGO.map((m) => [m.value, m.label]))

function etiquetaCantidadUnidad(cantidad, unidad) {
  const et = ETIQUETA_UNIDAD[unidad]
  if (!et) return `${cantidad} ${unidad}`
  return `${cantidad} ${Number(cantidad) === 1 ? et.singular : et.plural}`
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

function ultimos7Dias() {
  const desde = new Date()
  desde.setDate(desde.getDate() - 7)
  return { desde: desde.toISOString().slice(0, 10), hasta: hoyISO() }
}

function esteMes() {
  const ahora = new Date()
  const desde = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
  return { desde: desde.toISOString().slice(0, 10), hasta: hoyISO() }
}

export default function CuentaCorriente() {
  const location = useLocation()
  const [cliente, setCliente] = useState(null)
  const [movimientos, setMovimientos] = useState([])
  const [saldoTotal, setSaldoTotal] = useState(0)
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)

  const [movimientoActivo, setMovimientoActivo] = useState(null)
  const [detalle, setDetalle] = useState(null)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [errorDetalle, setErrorDetalle] = useState(null)

  // Reporte de deuda navega acá pasando el cliente ya elegido, para no
  // obligar a buscarlo de nuevo.
  useEffect(() => {
    const clienteId = location.state?.clienteId
    if (clienteId) obtenerCliente(clienteId).then(setCliente).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  useEffect(() => {
    if (!cliente) return
    obtenerSaldoCliente(cliente.id)
      .then(setSaldoTotal)
      .catch((e) => setError(traducirError(e)))
  }, [cliente])

  useEffect(() => {
    if (!cliente) return
    setCargando(true)
    obtenerMovimientosCuentaCorriente(cliente.id, { desde, hasta })
      .then(setMovimientos)
      .catch((e) => setError(traducirError(e)))
      .finally(() => setCargando(false))
  }, [cliente, desde, hasta])

  useEffect(() => {
    if (!movimientoActivo) return
    setCargandoDetalle(true)
    setErrorDetalle(null)
    const promesa =
      movimientoActivo.referencia_tipo === 'venta'
        ? obtenerItemsPedido(movimientoActivo.referencia_id)
        : movimientoActivo.referencia_tipo === 'pago'
          ? obtenerDetallePago(movimientoActivo.referencia_id)
          : Promise.resolve(null)
    promesa
      .then(setDetalle)
      .catch((e) => setErrorDetalle(traducirError(e)))
      .finally(() => setCargandoDetalle(false))
  }, [movimientoActivo])

  function cerrarDetalle() {
    setMovimientoActivo(null)
    setDetalle(null)
    setErrorDetalle(null)
  }

  const hayFiltro = !!(desde || hasta)
  const saldoPeriodo = movimientos.reduce((acc, m) => acc + (m.tipo === 'debito' ? Number(m.monto) : -Number(m.monto)), 0)

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 font-display text-xl text-marca">Cuenta corriente</h1>

      {cliente ? (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm">
          <p className="text-sm text-marca/70">
            Viendo cuenta corriente de <span className="font-medium text-marca">{cliente.nombre}</span>
          </p>
          <Button tamano="sm" variante="secundario" onClick={() => setCliente(null)}>
            Buscar otro cliente
          </Button>
        </div>
      ) : (
        <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
          <BuscadorCliente onSeleccionar={setCliente} />
        </div>
      )}

      {cliente && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl bg-marca p-4 text-white shadow-sm">
            <p className="text-xs text-white/70">Saldo total actual de {cliente.nombre}</p>
            <p className={`font-mono text-2xl ${saldoTotal > 0 ? 'text-yema' : 'text-white'}`}>{formatearMoneda(saldoTotal)}</p>
            {saldoTotal > 0 && <p className="mt-1 text-xs text-white/60">El cliente tiene deuda pendiente.</p>}
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-medium text-marca">Filtrar por período</h3>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-marca">Desde</span>
                <input
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  className="rounded-lg border border-marca/20 px-3 py-2 text-sm outline-none focus:border-marca-claro"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-marca">Hasta</span>
                <input
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  className="rounded-lg border border-marca/20 px-3 py-2 text-sm outline-none focus:border-marca-claro"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  tamano="sm"
                  variante="secundario"
                  onClick={() => {
                    const r = ultimos7Dias()
                    setDesde(r.desde)
                    setHasta(r.hasta)
                  }}
                >
                  Últimos 7 días
                </Button>
                <Button
                  type="button"
                  tamano="sm"
                  variante="secundario"
                  onClick={() => {
                    const r = esteMes()
                    setDesde(r.desde)
                    setHasta(r.hasta)
                  }}
                >
                  Este mes
                </Button>
                <Button
                  type="button"
                  tamano="sm"
                  variante="secundario"
                  onClick={() => {
                    setDesde('')
                    setHasta('')
                  }}
                >
                  Todo
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-sm font-medium text-marca">Movimientos</h3>
              <p className="text-xs text-marca/50">
                {hayFiltro ? (
                  <>
                    Saldo neto del período: <span className="font-mono">{formatearMoneda(saldoPeriodo)}</span> — no confundir con
                    el saldo total de arriba
                  </>
                ) : (
                  'Mostrando todos los movimientos'
                )}
              </p>
            </div>
            {cargando ? (
              <p className="text-sm text-marca/60">Cargando movimientos...</p>
            ) : error ? (
              <p className="text-sm text-perdida">{error}</p>
            ) : movimientos.length === 0 ? (
              <p className="text-sm text-marca/50">No hay movimientos para este período.</p>
            ) : (
              <ul className="divide-y divide-marca/10 text-sm">
                {movimientos.map((m) => (
                  <li
                    key={m.id}
                    className="flex cursor-pointer items-center justify-between py-2 hover:bg-marca/5"
                    onClick={() => setMovimientoActivo(m)}
                  >
                    <div>
                      <p className="text-marca">{m.descripcion || (m.tipo === 'debito' ? 'Venta' : 'Pago')}</p>
                      <p className="text-xs text-marca/50">{new Date(m.creado_at).toLocaleDateString('es-AR')}</p>
                    </div>
                    <span className={`font-mono ${m.tipo === 'debito' ? 'text-perdida' : 'text-fresco'}`}>
                      {m.tipo === 'debito' ? '+' : '-'}
                      {formatearMoneda(m.monto)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <Modal
        abierto={!!movimientoActivo}
        onCerrar={cerrarDetalle}
        titulo={movimientoActivo?.referencia_tipo === 'venta' ? 'Detalle de la venta' : 'Detalle del pago'}
      >
        {cargandoDetalle ? (
          <p className="text-sm text-marca/60">Cargando detalle...</p>
        ) : errorDetalle ? (
          <p className="text-sm text-perdida">{errorDetalle}</p>
        ) : movimientoActivo?.referencia_tipo === 'venta' && detalle ? (
          <div className="flex flex-col gap-2 text-sm">
            {detalle.length === 0 ? (
              <p className="text-marca/50">Este pedido no tiene líneas cargadas.</p>
            ) : (
              <ul className="divide-y divide-marca/10">
                {detalle.map((item) => (
                  <li key={item.id} className="flex items-center justify-between py-2">
                    <span className="text-marca">
                      {etiquetaCantidadUnidad(item.cantidad_unidad, item.unidad_vendida)} —{' '}
                      {item.productos?.nombre || 'Producto'}
                    </span>
                    <span className="font-mono text-marca">
                      {formatearMoneda(Number(item.precio_aplicado) * Number(item.cantidad_unidad))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex justify-between border-t border-marca/10 pt-2 font-medium text-marca">
              <span>Total</span>
              <span className="font-mono">
                {formatearMoneda(
                  detalle.reduce((acc, item) => acc + Number(item.precio_aplicado) * Number(item.cantidad_unidad), 0)
                )}
              </span>
            </div>
          </div>
        ) : movimientoActivo?.referencia_tipo === 'pago' && detalle ? (
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between border-b border-marca/10 py-2">
              <span className="text-marca/60">Fecha</span>
              <span className="text-marca">{new Date(detalle.creado_at).toLocaleDateString('es-AR')}</span>
            </div>
            <div className="flex justify-between border-b border-marca/10 py-2">
              <span className="text-marca/60">Medio de pago</span>
              <span className="text-marca">{ETIQUETA_MEDIO[detalle.medio] || detalle.medio}</span>
            </div>
            <div className="flex justify-between border-b border-marca/10 py-2">
              <span className="text-marca/60">Registrado por</span>
              <span className="text-marca">{detalle.perfiles?.nombre || '—'}</span>
            </div>
            <div className="flex justify-between py-2 font-medium text-marca">
              <span>Monto</span>
              <span className="font-mono">{formatearMoneda(detalle.monto)}</span>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
