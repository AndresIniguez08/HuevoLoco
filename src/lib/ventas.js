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

// Cubre tanto los pedidos de sucursal bloqueados esperando autorización de
// Central como cualquier pedido de Central armado y sin confirmar todavía.
export async function contarPedidosPendientes() {
  const { count, error } = await supabase
    .from('pedidos')
    .select('*', { count: 'exact', head: true })
    .eq('estado', 'pendiente')
  if (error) throw error
  return count || 0
}
