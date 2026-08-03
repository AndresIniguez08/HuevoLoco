import { supabase } from './supabase'
import { obtenerNombresProductos } from './productos'

// Trae todo lo necesario para el remito: cliente, líneas del pedido con
// nombre de producto, y el total ya está en pedidos.total. El saldo
// pendiente (si el pago es parcial) se calcula aparte con
// obtenerTotalesPagadosPorPedidos, que ya vive en lib/cobranzas.js.
// Accesible por vendedor/depósito (no solo dueño) — ver comentario en
// obtenerNombresProductos sobre por qué no se embebe productos(nombre) acá.
export async function obtenerPedidoParaImprimir(pedidoId) {
  const { data, error } = await supabase
    .from('pedidos')
    .select(
      '*, clientes(nombre, direccion, telefono), pedido_items(id, producto_id, cantidad_unidad, unidad_vendida, precio_aplicado)'
    )
    .eq('id', pedidoId)
    .single()
  if (error) throw error

  const nombresPorId = await obtenerNombresProductos((data.pedido_items || []).map((it) => it.producto_id))
  return {
    ...data,
    pedido_items: (data.pedido_items || []).map((it) => ({ ...it, productos: nombresPorId.get(it.producto_id) })),
  }
}

// Auditoría de precios especiales: todo pedido_item cargado con un precio
// distinto al de lista queda acá. aprobado_por/aprobado_at ya no significan
// una aprobación posterior (el backend audita el precio especial solo, en
// el momento de cargarse) — son simplemente quién lo cargó y cuándo.
// productos(nombre) se resuelve aparte por la misma razón que en
// obtenerPedidoParaImprimir: RLS de `productos` es exclusiva de dueño.
export async function listarHistorialPreciosEspeciales({ desde, hasta } = {}) {
  let query = supabase
    .from('pedido_items')
    .select(
      'id, producto_id, precio_lista, precio_aplicado, aprobado_por, aprobado_at, pedidos(clientes(nombre)), perfiles(nombre)'
    )
    .eq('es_precio_especial', true)
    .order('aprobado_at', { ascending: false })
  if (desde) query = query.gte('aprobado_at', desde)
  if (hasta) query = query.lte('aprobado_at', hasta)
  const { data, error } = await query
  if (error) throw error

  const nombresPorId = await obtenerNombresProductos((data || []).map((it) => it.producto_id))
  return (data || []).map((it) => ({ ...it, productos: nombresPorId.get(it.producto_id) }))
}
