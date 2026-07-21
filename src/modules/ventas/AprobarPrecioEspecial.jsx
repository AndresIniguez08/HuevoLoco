import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { traducirError } from '../../lib/errores'
import { useAuthStore } from '../../stores/authStore'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'

export default function AprobarPrecioEspecial() {
  const usuario = useAuthStore((s) => s.usuario)
  const [pedidos, setPedidos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [accionando, setAccionando] = useState(null)

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setCargando(true)
    try {
      const { data, error: errorItems } = await supabase
        .from('pedido_items')
        .select('*, productos(nombre), pedidos(id, estado, clientes(nombre))')
        .eq('es_precio_especial', true)
        .is('aprobado_por', null)
      if (errorItems) throw errorItems

      const porPedido = new Map()
      for (const item of data) {
        if (!item.pedidos || item.pedidos.estado === 'cancelado') continue
        const pedidoId = item.pedidos.id
        if (!porPedido.has(pedidoId)) {
          porPedido.set(pedidoId, { id: pedidoId, cliente: item.pedidos.clientes?.nombre, items: [] })
        }
        porPedido.get(pedidoId).items.push(item)
      }
      setPedidos(Array.from(porPedido.values()))
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

  if (cargando) return <p className="text-marca/60">Cargando pedidos...</p>

  return (
    <div>
      <h1 className="mb-4 font-display text-xl text-marca">Aprobar precios especiales</h1>
      {error && <p className="mb-3 text-sm text-perdida">{error}</p>}
      {pedidos.length === 0 ? (
        <p className="text-sm text-marca/50">No hay pedidos pendientes de aprobación.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {pedidos.map((p) => (
            <li key={p.id} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-medium text-marca">{p.cliente || 'Cliente'}</p>
                <Badge tono="neutro">Pendiente</Badge>
              </div>
              <ul className="mb-3 divide-y divide-marca/10 text-sm">
                {p.items.map((it) => (
                  <li key={it.id} className="flex justify-between py-1.5">
                    <span>{it.productos?.nombre}</span>
                    <span className="font-mono">${it.precio_aplicado}</span>
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
    </div>
  )
}
