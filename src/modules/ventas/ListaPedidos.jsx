import { useEffect, useState } from 'react'
import { Check, Store, Trash2, Truck } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { traducirError } from '../../lib/errores'
import { useAuthStore } from '../../stores/authStore'
import {
  autorizarExcepcionCC,
  listarSaldosClientes,
  obtenerTotalesPagadosPorPedidos,
  obtenerUltimoPagoPedido,
} from '../../lib/cobranzas'
import { obtenerFechasInicioSaldoPendiente } from '../../lib/clientes'
import {
  MEDIOS_PAGO,
  ETIQUETA_ESTADO_PEDIDO,
  TONO_ESTADO_PEDIDO,
  ETIQUETA_ESTADO_PAGO,
  TONO_ESTADO_PAGO,
  ETIQUETA_TIPO_ENTREGA,
  ROLES,
} from '../../lib/constantes'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import AvisoSaldoCliente from '../../components/AvisoSaldoCliente'

// fn_confirmar_pedido devuelve estos mensajes en lenguaje claro cuando la
// confirmación chocaría con la cuenta corriente del cliente — se detectan
// por texto (sin pasar por traducirError) para poder ofrecer la carga de
// excepción. fn_registrar_pago ya no bloquea por esto: un pago reduce
// deuda, nunca debería rechazarse por límite de crédito.
function esBloqueoCCConfirmar(mensaje) {
  return /cuenta corriente autorizada|l[ií]mite autorizado/i.test(mensaje || '')
}

export default function ListaPedidos({ soloPropios = false }) {
  const usuario = useAuthStore((s) => s.usuario)
  const perfil = useAuthStore((s) => s.perfil)
  const puedeCargarExcepcion = perfil?.rol === ROLES.DUENO || perfil?.rol === ROLES.ADMINISTRATIVO
  const [pedidos, setPedidos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [accionando, setAccionando] = useState(null)
  const [bloqueoPedidoId, setBloqueoPedidoId] = useState(null)
  const [pedidoPago, setPedidoPago] = useState(null)
  const [pedidoExcepcion, setPedidoExcepcion] = useState(null)
  const [imprimiendoId, setImprimiendoId] = useState(null)
  const [saldosPorCliente, setSaldosPorCliente] = useState(new Map())
  const [fechasSaldoPorCliente, setFechasSaldoPorCliente] = useState(new Map())

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function cargar() {
    setCargando(true)
    try {
      const hoy = new Date().toISOString().slice(0, 10)
      let query = supabase
        .from('pedidos')
        .select('*, clientes(nombre)')
        .gte('creado_at', `${hoy}T00:00:00`)
        .order('creado_at', { ascending: false })
      if (soloPropios && usuario) query = query.eq('vendedor_id', usuario.id)
      const { data, error: errorPedidos } = await query
      if (errorPedidos) throw errorPedidos
      setPedidos(data)

      const saldos = await listarSaldosClientes()
      const idsConSaldo = saldos.map((c) => c.cliente_id)
      const fechas = await obtenerFechasInicioSaldoPendiente(idsConSaldo)
      setSaldosPorCliente(new Map(saldos.map((c) => [c.cliente_id, Number(c.saldo)])))
      setFechasSaldoPorCliente(fechas)

      setError(null)
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setCargando(false)
    }
  }

  async function confirmarPedido(pedidoId) {
    setAccionando(pedidoId)
    setError(null)
    setBloqueoPedidoId(null)
    try {
      const { error: errorRpc } = await supabase.rpc('fn_confirmar_pedido', { p_pedido_id: pedidoId })
      // fn_confirmar_pedido ya devuelve el mensaje en lenguaje claro
      // (por ejemplo cuando hay precios especiales sin aprobar, o cuando
      // choca con el límite de cuenta corriente del cliente).
      if (errorRpc) throw new Error(errorRpc.message)
      await cargar()
    } catch (e) {
      setError(e.message)
      if (esBloqueoCCConfirmar(e.message)) setBloqueoPedidoId(pedidoId)
    } finally {
      setAccionando(null)
    }
  }

  async function marcarRetirado(pedidoId) {
    setAccionando(pedidoId)
    setError(null)
    try {
      const { error: errorRpc } = await supabase.rpc('fn_marcar_retirado', { p_pedido_id: pedidoId })
      if (errorRpc) throw new Error(errorRpc.message)
      await cargar()
    } catch (e) {
      setError(e.message)
    } finally {
      setAccionando(null)
    }
  }

  function excepcionCargada() {
    setPedidoExcepcion(null)
    setBloqueoPedidoId(null)
    cargar()
  }

  async function imprimirUltimoComprobante(pedidoId) {
    setImprimiendoId(pedidoId)
    setError(null)
    try {
      const pago = await obtenerUltimoPagoPedido(pedidoId)
      window.open(`/pago/${pago.id}/imprimir`, '_blank')
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setImprimiendoId(null)
    }
  }

  if (cargando) return <p className="text-marca/60">Cargando pedidos...</p>

  return (
    <div>
      <h1 className="mb-4 font-display text-xl text-marca">{soloPropios ? 'Mis pedidos de hoy' : 'Pedidos de hoy'}</h1>
      {error && <p className="mb-3 text-sm text-perdida">{error}</p>}
      {pedidos.length === 0 ? (
        <p className="text-sm text-marca/50">No hay pedidos todavía hoy.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {pedidos.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm">
              <div>
                <p className="font-medium text-marca">{p.clientes?.nombre || 'Cliente'}</p>
                <p className="font-mono text-sm text-marca/60">${Number(p.total).toFixed(2)}</p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Badge tono="neutro" className="inline-flex items-center gap-1">
                  {p.tipo_entrega === 'retiro_local' ? <Store size={12} /> : <Truck size={12} />}
                  {ETIQUETA_TIPO_ENTREGA[p.tipo_entrega] || p.tipo_entrega}
                </Badge>
                <Badge tono={TONO_ESTADO_PEDIDO[p.estado] || 'neutro'}>{ETIQUETA_ESTADO_PEDIDO[p.estado] || p.estado}</Badge>
                <Badge tono={TONO_ESTADO_PAGO[p.estado_pago] || 'neutro'}>{ETIQUETA_ESTADO_PAGO[p.estado_pago] || p.estado_pago}</Badge>
                {p.estado === 'pendiente' && (
                  <Button
                    tamano="sm"
                    variante="confirmar"
                    cargando={accionando === p.id}
                    onClick={() => confirmarPedido(p.id)}
                  >
                    Confirmar pedido
                  </Button>
                )}
                {p.estado === 'confirmado' && p.tipo_entrega === 'retiro_local' && (
                  <Button
                    tamano="sm"
                    variante="confirmar"
                    cargando={accionando === p.id}
                    onClick={() => marcarRetirado(p.id)}
                  >
                    Marcar como retirado
                  </Button>
                )}
                {p.estado !== 'cancelado' && p.estado_pago !== 'pagado' && (
                  <Button tamano="sm" onClick={() => setPedidoPago(p)}>
                    Registrar pago
                  </Button>
                )}
                {p.estado_pago !== 'pendiente' && (
                  <Button
                    tamano="sm"
                    variante="secundario"
                    cargando={imprimiendoId === p.id}
                    onClick={() => imprimirUltimoComprobante(p.id)}
                  >
                    Imprimir último comprobante
                  </Button>
                )}
                <Button
                  tamano="sm"
                  variante="secundario"
                  onClick={() => window.open(`/pedido/${p.id}/imprimir`, '_blank')}
                >
                  Imprimir remito
                </Button>
              </div>
              <AvisoSaldoCliente
                nombre={p.clientes?.nombre}
                saldo={saldosPorCliente.get(p.cliente_id)}
                desde={fechasSaldoPorCliente.get(p.cliente_id)}
                className="w-full"
              />
              {bloqueoPedidoId === p.id && (
                <div className="w-full">
                  {puedeCargarExcepcion ? (
                    <Button tamano="sm" variante="secundario" onClick={() => setPedidoExcepcion(p)}>
                      Cargar excepción y confirmar
                    </Button>
                  ) : (
                    <p className="text-sm text-marca/70">
                      Este pedido necesita autorización de un administrador antes de poder confirmarse. Avisale al dueño o
                      administrativo.
                    </p>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <ModalPago pedido={pedidoPago} onCerrar={() => setPedidoPago(null)} onPagado={cargar} />
      <ModalExcepcionConfirmar pedido={pedidoExcepcion} onCerrar={() => setPedidoExcepcion(null)} onConfirmado={excepcionCargada} />
    </div>
  )
}

function ModalExcepcionConfirmar({ pedido, onCerrar, onConfirmado }) {
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const [excepcionId, setExcepcionId] = useState(null)

  useEffect(() => {
    if (pedido) {
      setMotivo('')
      setError(null)
      setExcepcionId(null)
    }
  }, [pedido])

  if (!pedido) return null

  async function confirmar() {
    setEnviando(true)
    setError(null)
    try {
      const id = await autorizarExcepcionCC(pedido.id, Number(pedido.total), motivo)
      const { error: errorRpc } = await supabase.rpc('fn_confirmar_pedido', { p_pedido_id: pedido.id })
      if (errorRpc) throw new Error(errorRpc.message)
      setExcepcionId(id)
    } catch (e) {
      setError(e.message)
    } finally {
      setEnviando(false)
    }
  }

  if (excepcionId) {
    return (
      <Modal abierto={!!pedido} onCerrar={onConfirmado} titulo="Excepción cargada">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-fresco">Excepción cargada y pedido confirmado.</p>
          <Button
            type="button"
            variante="secundario"
            onClick={() => window.open(`/excepcion/${excepcionId}/imprimir`, '_blank')}
            className="w-full"
          >
            Imprimir autorización
          </Button>
          <Button type="button" onClick={onConfirmado} className="w-full">
            Cerrar
          </Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal abierto={!!pedido} onCerrar={onCerrar} titulo="Cargar excepción y confirmar">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-marca/70">
          Cliente: {pedido.clientes?.nombre || 'Cliente'} — Total: <span className="font-mono">${Number(pedido.total).toFixed(2)}</span>
        </p>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-marca">Motivo</span>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            className="rounded-lg border border-marca/20 px-3 py-2 outline-none focus:border-marca-claro"
          />
        </label>
        {error && <p className="text-sm text-perdida">{error}</p>}
        <Button type="button" onClick={confirmar} cargando={enviando} disabled={!motivo.trim()} className="w-full">
          Confirmar excepción y confirmar pedido
        </Button>
      </div>
    </Modal>
  )
}

function lineaDePagoVacia() {
  return { id: Math.random().toString(36).slice(2), monto: '', medio: 'efectivo', estado: 'pendiente', error: null }
}

function ModalPago({ pedido, onCerrar, onPagado }) {
  const [lineas, setLineas] = useState([])
  const [yaPagado, setYaPagado] = useState(0)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (pedido) {
      setLineas([{ ...lineaDePagoVacia(), monto: pedido.total != null ? String(pedido.total) : '' }])
      setEnviando(false)
      setYaPagado(0)
      obtenerTotalesPagadosPorPedidos([pedido.id])
        .then((totales) => setYaPagado(totales.get(pedido.id) || 0))
        .catch(() => setYaPagado(0))
    }
  }, [pedido])

  if (!pedido) return null

  const saldoPendiente = Number(pedido.total) - yaPagado
  const sumaLineas = lineas.reduce((acc, l) => acc + (Number(l.monto) || 0), 0)
  const diferencia = saldoPendiente - sumaLineas
  const cubreSaldo = diferencia <= 0

  function actualizarLinea(id, cambios) {
    setLineas((prev) => prev.map((l) => (l.id === id ? { ...l, ...cambios } : l)))
  }

  function agregarLinea() {
    setLineas((prev) => [...prev, lineaDePagoVacia()])
  }

  function quitarLinea(id) {
    setLineas((prev) => prev.filter((l) => l.id !== id))
  }

  async function confirmar() {
    setEnviando(true)
    for (const linea of lineas) {
      if (linea.estado === 'ok') continue
      actualizarLinea(linea.id, { estado: 'enviando', error: null })
      try {
        const { error: errorRpc } = await supabase.rpc('fn_registrar_pago', {
          p_pedido_id: pedido.id,
          p_cliente_id: pedido.cliente_id,
          p_monto: Number(linea.monto),
          p_medio: linea.medio,
        })
        if (errorRpc) throw errorRpc
        actualizarLinea(linea.id, { estado: 'ok', error: null })
      } catch (e) {
        actualizarLinea(linea.id, { estado: 'error', error: traducirError(e) })
        setEnviando(false)
        return
      }
    }
    setEnviando(false)
    onCerrar()
    onPagado()
  }

  return (
    <Modal abierto={!!pedido} onCerrar={onCerrar} titulo="Registrar pago">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-marca/70">
          Cliente: {pedido.clientes?.nombre || 'Cliente'} — Total: <span className="font-mono">${Number(pedido.total).toFixed(2)}</span>
        </p>

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
                    {MEDIOS_PAGO.map((m) => (
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

        <Button type="button" variante="secundario" tamano="sm" disabled={enviando} onClick={agregarLinea}>
          Agregar otro medio de pago
        </Button>

        <div className="rounded-lg bg-marca/5 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-marca/70">Total cargado</span>
            <span className="font-mono text-marca">${sumaLineas.toFixed(2)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-marca/70">Saldo pendiente del pedido</span>
            <span className="font-mono text-marca">${saldoPendiente.toFixed(2)}</span>
          </div>
          {cubreSaldo ? (
            <p className="mt-2 flex items-center gap-1.5 font-medium text-fresco">
              <Check size={16} /> Cubre el saldo pendiente
            </p>
          ) : (
            <p className="mt-2 text-perdida">
              Van a quedar <span className="font-mono">${diferencia.toFixed(2)}</span> pendientes en cuenta corriente.
            </p>
          )}
        </div>

        <Button onClick={confirmar} cargando={enviando} className="w-full">
          Registrar pago
        </Button>
      </div>
    </Modal>
  )
}
