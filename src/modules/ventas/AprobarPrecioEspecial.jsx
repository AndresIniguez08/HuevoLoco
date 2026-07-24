import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { traducirError } from '../../lib/errores'
import { useAuthStore } from '../../stores/authStore'
import { formatearMoneda } from '../../lib/formato'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import ModalExcepcionConfirmar from '../../components/ModalExcepcionConfirmar'

export default function AprobarPrecioEspecial() {
  const usuario = useAuthStore((s) => s.usuario)
  const perfil = useAuthStore((s) => s.perfil)
  const [pedidosPrecio, setPedidosPrecio] = useState([])
  const [pedidosBloqueados, setPedidosBloqueados] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [accionando, setAccionando] = useState(null)
  const [pedidoExcepcion, setPedidoExcepcion] = useState(null)
  const [ultimaExcepcionId, setUltimaExcepcionId] = useState(null)

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil?.sucursal_id])

  async function cargar() {
    setCargando(true)
    try {
      // Precios especiales pendientes de aprobar (de cualquier pedido) y,
      // en paralelo, la cola de pedidos de sucursales que quedaron
      // bloqueados por cuenta corriente/límite (estado sigue 'pendiente'
      // porque fn_completar_venta_sucursal falló después de crear el
      // pedido) — dos colas distintas, ambas cosas que solo Central decide.
      const [itemsRes, bloqueadosRes] = await Promise.all([
        supabase
          .from('pedido_items')
          .select('*, productos(nombre), pedidos(id, estado, clientes(nombre))')
          .eq('es_precio_especial', true)
          .is('aprobado_por', null),
        perfil?.sucursal_id
          ? supabase
              .from('pedidos')
              .select('*, clientes(nombre), sucursales(nombre)')
              .eq('estado', 'pendiente')
              .neq('sucursal_id', perfil.sucursal_id)
              .order('creado_at', { ascending: false })
          : Promise.resolve({ data: [], error: null }),
      ])
      if (itemsRes.error) throw itemsRes.error
      if (bloqueadosRes.error) throw bloqueadosRes.error

      const porPedido = new Map()
      for (const item of itemsRes.data) {
        if (!item.pedidos || item.pedidos.estado === 'cancelado') continue
        const pedidoId = item.pedidos.id
        if (!porPedido.has(pedidoId)) {
          porPedido.set(pedidoId, { id: pedidoId, cliente: item.pedidos.clientes?.nombre, items: [] })
        }
        porPedido.get(pedidoId).items.push(item)
      }
      setPedidosPrecio(Array.from(porPedido.values()))
      setPedidosBloqueados(bloqueadosRes.data || [])
      setError(null)
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setCargando(false)
    }
  }

  async function aprobar(pedido) {
    setAccionando(pedido.id)
    setError(null)
    try {
      const { error: errorUpdate } = await supabase
        .from('pedido_items')
        .update({ aprobado_por: usuario.id, aprobado_at: new Date().toISOString() })
        .in(
          'id',
          pedido.items.map((it) => it.id)
        )
      if (errorUpdate) throw errorUpdate
      await cargar()
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setAccionando(null)
    }
  }

  async function rechazar(pedido) {
    setAccionando(pedido.id)
    setError(null)
    try {
      const { error: errorUpdate } = await supabase.from('pedidos').update({ estado: 'cancelado' }).eq('id', pedido.id)
      if (errorUpdate) throw errorUpdate
      await cargar()
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setAccionando(null)
    }
  }

  function excepcionCargada(excepcionId) {
    setPedidoExcepcion(null)
    setUltimaExcepcionId(excepcionId || null)
    cargar()
  }

  if (cargando) return <p className="text-marca/60">Cargando pedidos...</p>

  return (
    <div>
      <h1 className="mb-4 font-display text-xl text-marca">Aprobaciones</h1>
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

      <h2 className="mb-3 text-sm font-medium text-marca">Precios especiales pendientes</h2>
      {pedidosPrecio.length === 0 ? (
        <p className="text-sm text-marca/50">No hay pedidos pendientes de aprobación.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {pedidosPrecio.map((p) => (
            <li key={p.id} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-medium text-marca">{p.cliente || 'Cliente'}</p>
                <Badge tono="neutro">Pendiente</Badge>
              </div>
              <ul className="mb-3 divide-y divide-marca/10 text-sm">
                {p.items.map((it) => (
                  <li key={it.id} className="flex justify-between py-1.5">
                    <span>{it.productos?.nombre}</span>
                    <span className="font-mono">{formatearMoneda(it.precio_aplicado)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-end gap-2">
                <Button tamano="sm" variante="peligro" cargando={accionando === p.id} onClick={() => rechazar(p)}>
                  Rechazar pedido
                </Button>
                <Button tamano="sm" variante="confirmar" cargando={accionando === p.id} onClick={() => aprobar(p)}>
                  Aprobar precios
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-3 mt-6 text-sm font-medium text-marca">Pedidos bloqueados de sucursales</h2>
      {pedidosBloqueados.length === 0 ? (
        <p className="text-sm text-marca/50">No hay pedidos de sucursal esperando autorización.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {pedidosBloqueados.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm">
              <div>
                <p className="font-medium text-marca">{p.clientes?.nombre || 'Cliente'}</p>
                <p className="text-xs text-marca/50">{p.sucursales?.nombre || 'Sucursal'}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-marca">{formatearMoneda(p.total)}</span>
                <Button tamano="sm" variante="secundario" onClick={() => setPedidoExcepcion(p)}>
                  Cargar excepción
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ModalExcepcionConfirmar pedido={pedidoExcepcion} onCerrar={() => setPedidoExcepcion(null)} onConfirmado={excepcionCargada} />
    </div>
  )
}
