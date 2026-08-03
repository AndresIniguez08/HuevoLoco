import { useEffect, useState } from 'react'
import { Check, Store, Trash2, Truck, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { traducirError } from '../../lib/errores'
import { useAuthStore } from '../../stores/authStore'
import { listarSaldosClientes, obtenerTotalesPagadosPorPedidos, obtenerUltimoPagoPedido } from '../../lib/cobranzas'
import { obtenerFechasInicioSaldoPendiente } from '../../lib/clientes'
import { useRefrescoPeriodico } from '../../hooks/useRefrescoPeriodico'
import {
  MEDIOS_PAGO,
  ETIQUETA_ESTADO_PEDIDO,
  TONO_ESTADO_PEDIDO,
  ETIQUETA_ESTADO_PAGO,
  TONO_ESTADO_PAGO,
  ETIQUETA_TIPO_ENTREGA,
  ROLES,
} from '../../lib/constantes'
import { formatearMoneda, formatearFecha } from '../../lib/formato'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import AvisoSaldoCliente from '../../components/AvisoSaldoCliente'
import ModalExcepcionConfirmar from '../../components/ModalExcepcionConfirmar'
import ModalCancelarPedido from '../../components/ModalCancelarPedido'
import BotonVolverInicio from '../../components/BotonVolverInicio'

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
  // Comprobante de pago: documento financiero (medio de cobro, monto) — no le
  // corresponde a depósito, que solo maneja logística de entrega/retiro, ni a
  // vendedor (ver esVendedor más abajo).
  const puedeVerComprobantePago = perfil?.rol === ROLES.DUENO || perfil?.rol === ROLES.ADMINISTRATIVO
  // fn_confirmar_pedido y fn_registrar_pago ya no aceptan el rol vendedor a
  // nivel backend (confirmar es lo que genera la deuda real en cuenta
  // corriente — eso queda en manos de quien controla caja). Acá su vista
  // queda de solo lectura: ve estado/tipo de entrega/estado de pago como
  // badges, pero ni un botón de acción ni información extra (saldo del
  // cliente, excepciones) en toda la pantalla.
  const esVendedor = perfil?.rol === ROLES.VENDEDOR
  // Mismos roles que gestionan ventas/cobros en esta pantalla — ver
  // puedeVerComprobantePago/puedeCargarExcepcion más arriba para el mismo
  // criterio aplicado a otras acciones.
  const puedeCancelarPedido =
    perfil?.rol === ROLES.DUENO ||
    perfil?.rol === ROLES.ADMINISTRATIVO ||
    perfil?.rol === ROLES.ENCARGADO_SUCURSAL ||
    perfil?.rol === ROLES.CAJERO_MOSTRADOR
  const [pedidos, setPedidos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [accionando, setAccionando] = useState(null)
  const [bloqueoPedidoId, setBloqueoPedidoId] = useState(null)
  const [pedidoPago, setPedidoPago] = useState(null)
  const [pedidoCancelar, setPedidoCancelar] = useState(null)
  const [pedidoExcepcion, setPedidoExcepcion] = useState(null)
  const [ultimaExcepcionId, setUltimaExcepcionId] = useState(null)
  const [imprimiendoId, setImprimiendoId] = useState(null)
  const [saldosPorCliente, setSaldosPorCliente] = useState(new Map())
  const [fechasSaldoPorCliente, setFechasSaldoPorCliente] = useState(new Map())

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Refresco silencioso cada 20s + al volver a la pestaña: otro vendedor o
  // depósito puede confirmar/cobrar/marcar retirado un pedido en paralelo.
  // `silencioso` evita tocar `cargando` (que desmontaría toda la pantalla,
  // incluidos los modales de pago/excepción si están abiertos) y evita pisar
  // el mensaje de `error` de una acción que el usuario acaba de disparar.
  useRefrescoPeriodico(() => cargar({ silencioso: true }), { inicial: false })

  async function cargar({ silencioso = false } = {}) {
    if (!silencioso) setCargando(true)
    try {
      const hoy = new Date().toISOString().slice(0, 10)
      // Un pedido pendiente sigue necesitando atención más allá del día en
      // que se generó (el badge del sidebar ya lo cuenta así, sin filtro de
      // fecha) — por eso acá se trae con .or(): pendientes de cualquier día,
      // más el resto de los pedidos (confirmados/entregados/etc.) de hoy.
      let query = supabase
        .from('pedidos')
        .select('*, clientes(nombre)')
        .or(`estado.eq.pendiente,creado_at.gte.${hoy}T00:00:00`)
        .order('creado_at', { ascending: false })
      // Esta pantalla es de Central (dueño/admin/vendedor/depósito son todos
      // roles de Casa Central) — los pedidos de sucursal tienen su propia
      // cola en Aprobaciones cuando quedan bloqueados, y su propia pantalla
      // de venta para lo demás. Sin este filtro se mezclaban acá.
      if (perfil?.sucursal_id) query = query.eq('sucursal_id', perfil.sucursal_id)
      if (soloPropios && usuario) query = query.eq('vendedor_id', usuario.id)
      const { data, error: errorPedidos } = await query
      if (errorPedidos) throw errorPedidos
      setPedidos(data)

      const saldos = await listarSaldosClientes()
      const idsConSaldo = saldos.map((c) => c.cliente_id)
      const fechas = await obtenerFechasInicioSaldoPendiente(idsConSaldo)
      setSaldosPorCliente(new Map(saldos.map((c) => [c.cliente_id, Number(c.saldo)])))
      setFechasSaldoPorCliente(fechas)

      if (!silencioso) setError(null)
    } catch (e) {
      if (!silencioso) setError(traducirError(e))
    } finally {
      if (!silencioso) setCargando(false)
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

  function pedidoCancelado() {
    setPedidoCancelar(null)
    cargar()
  }

  function excepcionCargada(excepcionId) {
    setPedidoExcepcion(null)
    setBloqueoPedidoId(null)
    setUltimaExcepcionId(excepcionId || null)
    cargar()
  }

  async function imprimirUltimoComprobante(pedidoId) {
    setImprimiendoId(pedidoId)
    setError(null)
    try {
      const pago = await obtenerUltimoPagoPedido(pedidoId)
      if (!pago) {
        setError('Este pedido no tiene ningún pago registrado todavía.')
        return
      }
      window.open(`/pago/${pago.id}/imprimir`, '_blank')
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setImprimiendoId(null)
    }
  }

  if (cargando) return <p className="text-marca/60">Cargando pedidos...</p>

  // pendientes: cualquier día, nunca deben quedar invisibles solo porque
  // pasó la medianoche (el badge del sidebar ya los cuenta así). El resto
  // sigue siendo "de hoy" gracias al .or() de cargar().
  const pendientes = pedidos.filter((p) => p.estado === 'pendiente')
  const otros = pedidos.filter((p) => p.estado !== 'pendiente')

  function renderPedido(p, { mostrarFecha = false } = {}) {
    const cancelado = p.estado === 'cancelado'
    return (
      <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm">
        <div>
          <p className="font-medium text-marca">{p.clientes?.nombre || 'Cliente'}</p>
          {mostrarFecha && <p className="text-xs text-marca/50">{formatearFecha(p.creado_at)}</p>}
          <p className="font-mono text-sm text-marca/60">{formatearMoneda(p.total)}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Badge tono="neutro" className="inline-flex items-center gap-1">
            {p.tipo_entrega === 'retiro_local' ? <Store size={12} /> : <Truck size={12} />}
            {ETIQUETA_TIPO_ENTREGA[p.tipo_entrega] || p.tipo_entrega}
          </Badge>
          <Badge tono={TONO_ESTADO_PEDIDO[p.estado] || 'neutro'}>{ETIQUETA_ESTADO_PEDIDO[p.estado] || p.estado}</Badge>
          <Badge tono={TONO_ESTADO_PAGO[p.estado_pago] || 'neutro'}>{ETIQUETA_ESTADO_PAGO[p.estado_pago] || p.estado_pago}</Badge>
          {!esVendedor && !cancelado && (
            <>
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
              {p.estado_pago !== 'pagado' && (
                <Button tamano="sm" onClick={() => setPedidoPago(p)}>
                  Registrar pago
                </Button>
              )}
              {puedeVerComprobantePago && p.estado_pago !== 'pendiente' && (
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
              {puedeCancelarPedido && (
                <Button tamano="sm" variante="peligro" onClick={() => setPedidoCancelar(p)}>
                  {p.estado === 'entregado' ? 'Anular pedido' : 'Cancelar pedido'}
                </Button>
              )}
            </>
          )}
        </div>
        {!esVendedor && (
          <>
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
          </>
        )}
      </li>
    )
  }

  // Para vendedor, que ya no puede registrar pagos ni confirmar acá, "Cobrar"
  // sería engañoso — el título vuelve a la versión simple en ese caso.
  const titulo = esVendedor ? (soloPropios ? 'Mis pedidos' : 'Pedidos') : soloPropios ? 'Cobrar mis pedidos' : 'Cobrar pedidos'

  return (
    <div>
      <BotonVolverInicio />
      <h1 className="mb-4 font-display text-xl text-marca">{titulo}</h1>
      {error && <p className="mb-3 text-sm text-perdida">{error}</p>}
      {ultimaExcepcionId && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-lg bg-fresco/10 p-3 text-sm text-fresco">
          <span>Excepción cargada y pedido confirmado.</span>
          <div className="flex items-center gap-3">
            <button
              className="underline"
              onClick={() => window.open(`/excepcion/${ultimaExcepcionId}/imprimir`, '_blank')}
            >
              Imprimir autorización
            </button>
            <button onClick={() => setUltimaExcepcionId(null)} aria-label="Cerrar aviso">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {pendientes.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-medium text-marca">
            Pendientes de confirmar
            <Badge tono="error">{pendientes.length}</Badge>
          </h2>
          <ul className="flex flex-col gap-2">{pendientes.map((p) => renderPedido(p, { mostrarFecha: true }))}</ul>
        </div>
      )}

      <div>
        {pendientes.length > 0 && <h2 className="mb-2 text-sm font-medium text-marca">Pedidos de hoy</h2>}
        {otros.length === 0 ? (
          <p className="text-sm text-marca/50">
            {pendientes.length > 0 ? 'No hay más pedidos hoy.' : 'No hay pedidos todavía hoy.'}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">{otros.map((p) => renderPedido(p))}</ul>
        )}
      </div>

      <ModalPago pedido={pedidoPago} onCerrar={() => setPedidoPago(null)} onPagado={cargar} />
      <ModalCancelarPedido pedido={pedidoCancelar} onCerrar={() => setPedidoCancelar(null)} onCancelado={pedidoCancelado} />
      <ModalExcepcionConfirmar pedido={pedidoExcepcion} onCerrar={() => setPedidoExcepcion(null)} onConfirmado={excepcionCargada} />
    </div>
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
          Cliente: {pedido.clientes?.nombre || 'Cliente'} — Total: <span className="font-mono">{formatearMoneda(pedido.total)}</span>
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
            <span className="font-mono text-marca">{formatearMoneda(sumaLineas)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-marca/70">Saldo pendiente del pedido</span>
            <span className="font-mono text-marca">{formatearMoneda(saldoPendiente)}</span>
          </div>
          {cubreSaldo ? (
            <p className="mt-2 flex items-center gap-1.5 font-medium text-fresco">
              <Check size={16} /> Cubre el saldo pendiente
            </p>
          ) : (
            <p className="mt-2 text-perdida">
              Van a quedar <span className="font-mono">{formatearMoneda(diferencia)}</span> pendientes en cuenta corriente.
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

