import { supabase } from './supabase'

// Mapa producto_id -> { precio_maple, precio_caja, precio_cajon } para la
// lista de precios de un cliente. Los tres precios son independientes, no se
// derivan entre sí. Si el cliente no tiene lista_precio_id asignada, devuelve
// un mapa vacío: no hay precio de referencia y el vendedor tiene que
// ingresarlo a mano.
export async function obtenerPreciosLista(listaId) {
  if (!listaId) return {}
  const { data, error } = await supabase
    .from('lista_precio_items')
    .select('producto_id, precio_maple, precio_caja, precio_cajon')
    .eq('lista_id', listaId)
  if (error) throw error
  return Object.fromEntries(data.map((it) => [it.producto_id, it]))
}
