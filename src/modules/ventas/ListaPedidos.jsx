import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { traducirError } from '../../lib/errores'
import { useAuthStore } from '../../stores/authStore'
import { autorizarExcepcionCC, obtenerUltimoPagoPedido } from '../../lib/cobranzas'
import {
  MEDIOS_PAGO,
  ETIQUETA_ESTADO_PEDIDO,
  TONO_ESTADO_PEDIDO,
  ETIQUETA_ESTADO_PAGO,
  TONO_ESTADO_PAGO,
  ROLES,
} from '../../lib/constantes'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'

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

  function excepcionCargada() {
    setPedidoExcepcion(null)
    setBloqueoPedidoId(null)
    cargar()
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
                {p.estado !== 'cancelado' && p.estado_pago !== 'pagado' && (
                  <Button tamano="sm" onClick={() => setPedidoPago(p)}>
                    Registrar pago
                  </Button>
                )}
              </div>
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

  useEffect(() => {
    if (pedido) {
      setMotivo('')
      setError(null)
    }
  }, [pedido])

  if (!pedido) return null

  async function confirmar() {
    setEnviando(true)
    setError(null)
    try {
      await autorizarExcepcionCC(pedido.id, Number(pedido.total), motivo)
      const { error: errorRpc } = await supabase.rpc('fn_confirmar_pedido', { p_pedido_id: pedido.id })
      if (errorRpc) throw new Error(errorRpc.message)
      onConfirmado()
    } catch (e) {
      setError(e.message)
    } finally {
      setEnviando(false)
    }
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

function ModalPago({ pedido, onCerrar, onPagado }) {
  const [vista, setVista] = useState('pago') // 'pago' | 'confirmacion'
  const [monto, setMonto] = useState('')
  const [medio, setMedio] = useState('efectivo')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const [pagoRegistrado, setPagoRegistrado] = useState(null)

  useEffect(() => {
    if (pedido) {
      setVista('pago')
      setMonto(pedido.total != null ? String(pedido.total) : '')
      setMedio('efectivo')
      setError(null)
      setPagoRegistrado(null)
    }
  }, [pedido])

  if (!pedido) return null

  async function registrarPago() {
    setEnviando(true)
    setError(null)
    try {
      const { error: errorRpc } = await supabase.rpc('fn_registrar_pago', {
        p_pedido_id: pedido.id,
        p_cliente_id: pedido.cliente_id,
        p_monto: Number(monto),
        p_medio: medio,
      })
      if (errorRpc) throw errorRpc
      const pago = await obtenerUltimoPagoPedido(pedido.id)
      setPagoRegistrado(pago)
      setVista('confirmacion')
      onPagado()
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setEnviando(false)
    }
  }

  function cerrarModal() {
    onCerrar()
  }

  if (vista === 'confirmacion') {
    return (
      <Modal abierto={!!pedido} onCerrar={cerrarModal} titulo="Pago registrado">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-marca/70">
            Se registró el pago de <span className="font-mono">${Number(monto).toFixed(2)}</span> para{' '}
            {pedido.clientes?.nombre || 'el cliente'}.
          </p>
          {pagoRegistrado && (
            <Button
              type="button"
              variante="secundario"
              onClick={() => window.open(`/pago/${pagoRegistrado.id}/imprimir`, '_blank')}
              className="w-full"
            >
              Imprimir comprobante
            </Button>
          )}
          <Button type="button" onClick={cerrarModal} className="w-full">
            Cerrar
          </Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal abierto={!!pedido} onCerrar={cerrarModal} titulo="Registrar pago">
      <div className="flex flex-col gap-3">
        <Input label="Monto" tipo="number" numerico min="0" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} />
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-marca">Medio de pago</span>
          <select
            value={medio}
            onChange={(e) => setMedio(e.target.value)}
            className="rounded-lg border border-marca/20 px-3 py-2 outline-none focus:border-marca-claro"
          >
            {MEDIOS_PAGO.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        {error && <p className="text-sm text-perdida">{error}</p>}
        <Button onClick={registrarPago} cargando={enviando} className="w-full">
          Registrar pago
        </Button>
      </div>
    </Modal>
  )
}
