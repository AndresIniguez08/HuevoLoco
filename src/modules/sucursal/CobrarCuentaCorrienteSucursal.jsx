import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, X } from 'lucide-react'
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

// Cobro contra mostrador: no tiene sentido "cobrar en cuenta corriente" acá
// — mismo criterio que MEDIOS_COBRO_ENTREGA en VistaChofer.jsx.
const MEDIOS_COBRO = MEDIOS_PAGO.filter((m) => m.value !== 'cuenta_corriente')

function lineaDePagoVacia() {
  return { id: crypto.randomUUID(), monto: '', medio: 'efectivo', estado: 'pendiente', error: null }
}

export default function CobrarCuentaCorrienteSucursal() {
  const navigate = useNavigate()
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
    <div className="mx-auto min-h-screen max-w-2xl bg-fondo p-4 pb-10">
      <button onClick={() => navigate('/sucursal')} className="mb-4 flex items-center gap-2 text-lg text-marca">
        <ArrowLeft size={24} /> Volver
      </button>
      <h1 className="mb-4 font-display text-2xl text-marca">Cobrar cuenta corriente</h1>

      {cliente ? (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-lg font-medium text-marca">{cliente.nombre}</p>
          <Button tamano="sm" variante="secundario" onClick={() => setCliente(null)}>
            Cambiar
          </Button>
        </div>
      ) : (
        <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
          <BuscadorCliente onSeleccionar={elegirCliente} />
        </div>
      )}

      {cliente && (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl bg-marca p-5 text-center text-white shadow-sm">
            <p className="text-sm text-white/70">Saldo actual</p>
            <p className="font-mono text-4xl leading-tight">{cargandoSaldo ? '…' : formatearMoneda(saldo)}</p>
          </div>

          {pagoId && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-fresco/10 p-4 text-fresco">
              <span className="text-lg font-medium">Cobro registrado</span>
              <div className="flex items-center gap-3">
                <button
                  className="text-base font-medium underline"
                  onClick={() => window.open(`/pago/${pagoId}/imprimir`, '_blank')}
                >
                  Imprimir
                </button>
                <button onClick={() => setPagoId(null)} aria-label="Cerrar aviso">
                  <X size={18} />
                </button>
              </div>
            </div>
          )}

          {!cargandoSaldo && saldo <= 0 ? (
            <p className="rounded-2xl bg-white p-5 text-center text-lg text-marca/60 shadow-sm">
              Este cliente no tiene deuda pendiente.
            </p>
          ) : (
            !cargandoSaldo && (
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3">
                  {lineas.map((linea, i) => {
                    const bloqueada = linea.estado === 'ok' || enviando
                    return (
                      <div key={linea.id} className="rounded-xl border border-marca/10 p-3">
                        <p className="mb-2 text-sm font-medium text-marca">Pago {i + 1}</p>
                        <div className="flex flex-col gap-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            placeholder="Monto"
                            disabled={bloqueada}
                            value={linea.monto}
                            onChange={(e) => actualizarLinea(linea.id, { monto: e.target.value })}
                            className="min-h-[56px] rounded-xl border border-marca/20 px-4 py-3 text-xl font-mono outline-none focus:border-marca-claro disabled:bg-marca/5"
                          />
                          <select
                            value={linea.medio}
                            disabled={bloqueada}
                            onChange={(e) => actualizarLinea(linea.id, { medio: e.target.value })}
                            className="min-h-[56px] rounded-xl border border-marca/20 px-4 py-3 text-lg outline-none focus:border-marca-claro disabled:bg-marca/5"
                          >
                            {MEDIOS_COBRO.map((m) => (
                              <option key={m.value} value={m.value}>
                                {m.label}
                              </option>
                            ))}
                          </select>
                          {linea.estado !== 'ok' && lineas.length > 1 && !enviando && (
                            <button
                              onClick={() => setLineas((prev) => prev.filter((x) => x.id !== linea.id))}
                              className="flex items-center justify-center gap-1 text-sm text-perdida"
                            >
                              <Trash2 size={16} /> Quitar este pago
                            </button>
                          )}
                        </div>
                        {linea.error && <p className="mt-1 text-xs text-perdida">{linea.error}</p>}
                      </div>
                    )
                  })}
                </div>

                <button
                  onClick={() => setLineas((prev) => [...prev, lineaDePagoVacia()])}
                  className="mt-3 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl border border-marca/20 bg-white text-base font-medium text-marca"
                >
                  <Plus size={18} /> Agregar otro medio de pago
                </button>

                <p className="mt-3 flex justify-end border-t border-marca/10 pt-3 font-mono text-2xl text-marca">
                  {formatearMoneda(sumaLineas)}
                </p>

                {error && <p className="mt-2 text-center text-base text-perdida">{error}</p>}

                <Button
                  variante="confirmar"
                  className="mt-4 min-h-[64px] w-full text-xl"
                  disabled={!puedeConfirmar}
                  cargando={enviando}
                  onClick={confirmarCobro}
                >
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
