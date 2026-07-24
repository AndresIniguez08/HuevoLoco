import { supabase } from './supabase'

// La sucursal de origen la infiere el backend a partir del perfil de quien
// llama — no hace falta (ni conviene) mandarla desde acá.
export async function crearVentaSucursal(clienteId, items) {
  const { data, error } = await supabase.rpc('fn_crear_venta_sucursal', {
    p_cliente_id: clienteId,
    p_items: items,
  })
  if (error) throw error
  return data
}

// Puede fallar si el cliente no tiene cuenta corriente autorizada (o supera
// el límite) — en ese caso el pedido ya quedó creado por crearVentaSucursal,
// así que se puede reintentar con el mismo pedidoId una vez que Central
// autorice, sin volver a armar la venta.
export async function completarVentaSucursal(pedidoId, pagos) {
  const { error } = await supabase.rpc('fn_completar_venta_sucursal', {
    p_pedido_id: pedidoId,
    p_pagos: pagos,
  })
  if (error) throw error
}
