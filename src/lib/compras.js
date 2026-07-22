import { supabase } from './supabase'

export async function registrarCompra(proveedorId, items) {
  const { data, error } = await supabase.rpc('fn_registrar_compra', {
    p_proveedor_id: proveedorId,
    p_items: items,
  })
  if (error) throw error
  return data
}

export async function obtenerCompraParaImprimir(compraId) {
  const { data, error } = await supabase
    .from('compras')
    .select(
      '*, proveedores(nombre), compra_items(id, cantidad_maple, unidad_transaccion, cantidad_unidad, costo_unitario, productos(nombre))'
    )
    .eq('id', compraId)
    .single()
  if (error) throw error
  return data
}
