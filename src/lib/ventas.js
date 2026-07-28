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
