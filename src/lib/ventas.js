import { supabase } from './supabase'

// Trae todo lo necesario para el remito: cliente, líneas del pedido con
// nombre de producto, y el total ya está en pedidos.total. El saldo
// pendiente (si el pago es parcial) se calcula aparte con
// obtenerTotalesPagadosPorPedidos, que ya vive en lib/cobranzas.js.
export async function obtenerPedidoParaImprimir(pedidoId) {
  const { data, error } = await supabase
    .from('pedidos')
    .select(
      '*, clientes(nombre, direccion, telefono), pedido_items(id, cantidad_unidad, unidad_vendida, precio_aplicado, productos(nombre))'
    )
    .eq('id', pedidoId)
    .single()
  if (error) throw error
  return data
}
