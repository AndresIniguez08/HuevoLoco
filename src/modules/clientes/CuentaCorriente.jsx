import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { obtenerCliente, obtenerMovimientosCuentaCorriente } from '../../lib/clientes'
import { obtenerSaldoCliente } from '../../lib/cobranzas'
import { traducirError } from '../../lib/errores'
import BuscadorCliente from '../../components/BuscadorCliente'
import Button from '../../components/ui/Button'

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

  const hayFiltro = !!(desde || hasta)
  const saldoPeriodo = movimientos.reduce((acc, m) => acc + (m.tipo === 'debito' ? Number(m.monto) : -Number(m.monto)), 0)

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 font-display text-xl text-marca">Cuenta corriente</h1>

      <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
        <BuscadorCliente onSeleccionar={setCliente} />
      </div>

      {cliente && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl bg-marca p-4 text-white shadow-sm">
            <p className="text-xs text-white/70">Saldo total actual de {cliente.nombre}</p>
            <p className={`font-mono text-2xl ${saldoTotal > 0 ? 'text-yema' : 'text-white'}`}>${saldoTotal.toFixed(2)}</p>
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
                    Saldo neto del período: <span className="font-mono">${saldoPeriodo.toFixed(2)}</span> — no confundir con
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
                  <li key={m.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-marca">{m.descripcion || (m.tipo === 'debito' ? 'Venta' : 'Pago')}</p>
                      <p className="text-xs text-marca/50">{new Date(m.creado_at).toLocaleDateString('es-AR')}</p>
                    </div>
                    <span className={`font-mono ${m.tipo === 'debito' ? 'text-perdida' : 'text-fresco'}`}>
                      {m.tipo === 'debito' ? '+' : '-'}${Number(m.monto).toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
