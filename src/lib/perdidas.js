import { supabase } from './supabase'

export async function registrarPerdida({ productoId, cantidadMaple, motivo, unidad, cantidad }) {
  const { data, error } = await supabase.rpc('fn_registrar_perdida', {
    p_producto_id: productoId,
    p_cantidad_maple: cantidadMaple,
    p_motivo: motivo,
    p_unidad_transaccion: unidad,
    p_cantidad_unidad_transaccion: cantidad,
  })
  if (error) throw error
  return data
}

export async function obtenerPerdida(id) {
  const { data, error } = await supabase
    .from('perdidas')
    .select('*, productos(nombre), perfiles(nombre)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}
