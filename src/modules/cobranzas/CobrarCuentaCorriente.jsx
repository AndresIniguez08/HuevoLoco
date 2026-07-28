import { useEffect, useState } from 'react'
import { Check, Trash2, X } from 'lucide-react'
import {
  obtenerSaldoCliente,
  registrarPagoGeneral,
  obtenerUltimoPagoGeneralCliente,
} from '../../lib/cobranzas'
import { traducirError } from '../../lib/errores'
import { MEDIOS_PAGO } from '../../lib/constantes'
import { formatearMoneda } from '../../lib/formato'
import BuscadorCliente from '../../components/BuscadorCliente'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

// Cobro contra entrega/mostrador: no tiene sentido "cobrar en cuenta
// corriente" un pago que ya es en sí mismo contra la cuenta corriente —
// mismo criterio que MEDIOS_COBRO_ENTREGA en VistaChofer.jsx.
const MEDIOS_COBRO = MEDIOS_PAGO.filter((m) => m.value !== 'cuenta_corriente')

function lineaDePagoVacia() {
  return { id: Math.random().toString(36).slice(2), monto: '', medio: 'efectivo', estado: 'pendiente', error: null }
}

export default function CobrarCuentaCorriente() {
  const [cliente, setCliente] = useState(null)
  const [saldo, setSaldo] = useState(0)
  const [cargandoSaldo, setCargandoSaldo] = useState(false)
  const [lineas, setLineas] = useState([lineaDePagoVacia()])
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const [pagoId, setPagoId] = useState(null)

  useEffect(() => {
    if (!cliente) return
    cargarSaldo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente])

  function cargarSaldo() {
    setCargandoSaldo(true)
    obtenerSaldoCliente(cliente.id)
      .then(setSaldo)
      .catch((e) => setError(traducirError(e)))
      .finally(() => setCargandoSaldo(false))
  }

  function elegirCliente(c) {
    setCliente(c)
    setLineas([lineaDePagoVacia()])
    setPagoId(null)
    setError(null)
  }

  function actualizarLinea(id, cambios) {
    setLineas((prev) => prev.map((l) => (l.id === id ? { ...l, ...cambios } : l)))
  }

  function agregarLinea() {
    setLineas((prev) => [...prev, lineaDePagoVacia()])
  }

  function quitarLinea(id) {
    setLineas((prev) => prev.filter((l) => l.id !== id))
  }

  const sumaLineas = lineas.reduce((acc, l) => acc + (Number(l.monto) || 0), 0)
  const puedeConfirmar = lineas.every((l) => Number(l.monto) > 0) && sumaLineas > 0

  async function confirmarCobro() {
    setEnviando(true)
    setError(null)
    setPagoId(null)
    for (const linea of lineas) {
      if (linea.estado === 'ok') continue
      actualizarLinea(linea.id, { estado: 'enviando', error: null })
      try {
        await registrarPagoGeneral(cliente.id, Number(linea.monto), linea.medio)
        actualizarLinea(linea.id, { estado: 'ok', error: null })
      } catch (e) {
        actualizarLinea(linea.id, { estado: 'error', error: traducirError(e) })
        setEnviando(false)
        return
      }
    }
    setEnviando(false)
    try {
      const ultimo = await obtenerUltimoPagoGeneralCliente(cliente.id)
      setPagoId(ultimo?.id || null)
    } catch {
      // No crítico: el cobro ya se registró, solo no se pudo ofrecer imprimir.
    }
    setLineas([lineaDePagoVacia()])
    cargarSaldo()
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 font-display text-xl text-marca">Cobrar cuenta corriente</h1>

      {cliente ? (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm">
          <p className="text-sm text-marca/70">
            Cobrando a <span className="font-medium text-marca">{cliente.nombre}</span>
          </p>
          <Button tamano="sm" variante="secundario" onClick={() => setCliente(null)}>
            Buscar otro cliente
          </Button>
        </div>
      ) : (
        <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
          <BuscadorCliente onSeleccionar={elegirCliente} />
        </div>
      )}

      {cliente && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl bg-marca p-4 text-white shadow-sm">
            <p className="text-xs text-white/70">Saldo actual de {cliente.nombre}</p>
            <p className="font-mono text-2xl">{cargandoSaldo ? '…' : formatearMoneda(saldo)}</p>
          </div>

          {pagoId && (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-fresco/10 p-3 text-sm text-fresco">
              <span>Cobro registrado.</span>
              <div className="flex items-center gap-3">
                <button
                  className="underline"
                  onClick={() => window.open(`/pago/${pagoId}/imprimir`, '_blank')}
                >
                  Imprimir comprobante
                </button>
                <button onClick={() => setPagoId(null)} aria-label="Cerrar aviso">
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          {!cargandoSaldo && saldo <= 0 ? (
            <p className="rounded-xl bg-white p-4 text-sm text-marca/60 shadow-sm">
              Este cliente no tiene deuda pendiente.
            </p>
          ) : (
            !cargandoSaldo && (
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <h2 className="mb-3 text-sm font-medium text-marca">Registrar cobro</h2>

                <div className="flex flex-col gap-3">
                  {lineas.map((linea, i) => {
                    const bloqueada = linea.estado === 'ok' || enviando
                    return (
                      <div key={linea.id} className="rounded-lg border border-marca/10 p-3">
                        <div className="flex items-end gap-2">
                          <Input
                            label={`Monto (línea ${i + 1})`}
                            tipo="number"
                            numerico
                            min="0"
                            step="0.01"
                            disabled={bloqueada}
                            value={linea.monto}
                            onChange={(e) => actualizarLinea(linea.id, { monto: e.target.value })}
                            className="flex-1 disabled:bg-marca/5"
                          />
                          <label className="flex flex-1 flex-col gap-1 text-sm">
                            <span className="font-medium text-marca">Medio de pago</span>
                            <select
                              value={linea.medio}
                              disabled={bloqueada}
                              onChange={(e) => actualizarLinea(linea.id, { medio: e.target.value })}
                              className="rounded-lg border border-marca/20 px-3 py-2 outline-none focus:border-marca-claro disabled:bg-marca/5"
                            >
                              {MEDIOS_COBRO.map((m) => (
                                <option key={m.value} value={m.value}>
                                  {m.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          {linea.estado === 'ok' ? (
                            <Check size={18} className="mb-2.5 shrink-0 text-fresco" />
                          ) : (
                            lineas.length > 1 &&
                            !enviando && (
                              <button
                                type="button"
                                onClick={() => quitarLinea(linea.id)}
                                className="mb-2.5 shrink-0 text-perdida"
                                aria-label="Quitar línea de pago"
                              >
                                <Trash2 size={18} />
                              </button>
                            )
                          )}
                        </div>
                        {linea.error && <p className="mt-1 text-xs text-perdida">{linea.error}</p>}
                      </div>
                    )
                  })}
                </div>

                <Button type="button" variante="secundario" tamano="sm" disabled={enviando} onClick={agregarLinea} className="mt-3">
                  Agregar otro medio de pago
                </Button>

                <div className="mt-3 rounded-lg bg-marca/5 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-marca/70">Total a cobrar</span>
                    <span className="font-mono text-marca">{formatearMoneda(sumaLineas)}</span>
                  </div>
                </div>

                {error && <p className="mt-2 text-sm text-perdida">{error}</p>}

                <Button onClick={confirmarCobro} disabled={!puedeConfirmar} cargando={enviando} className="mt-3 w-full">
                  Registrar cobro
                </Button>
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}
