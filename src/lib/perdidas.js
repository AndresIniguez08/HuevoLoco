import { supabase } from './supabase'
import { obtenerNombresProductos } from './productos'

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

// Ruta de impresión accesible por depósito/encargado de sucursal (no solo
// dueño) — ver comentario en obtenerNombresProductos sobre por qué no se
// embebe productos(nombre) acá.
export async function obtenerPerdida(id) {
  const { data, error } = await supabase
    .from('perdidas')
    .select('*, perfiles(nombre)')
    .eq('id', id)
    .single()
  if (error) throw error

  const nombresPorId = await obtenerNombresProductos([data.producto_id])
  return { ...data, productos: nombresPorId.get(data.producto_id) }
}
