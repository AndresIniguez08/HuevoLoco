import { supabase } from './supabase'

export async function listarListasPrecio() {
  const { data, error } = await supabase.from('listas_precio').select('id, nombre').order('nombre')
  if (error) throw error
  return data
}

export async function crearListaPrecio(nombre) {
  const { data, error } = await supabase.from('listas_precio').insert({ nombre }).select('id, nombre').single()
  if (error) throw error
  return data
}

export async function obtenerItemsListaPrecio(listaId) {
  const { data, error } = await supabase
    .from('lista_precio_items')
    .select('producto_id, precio_maple, precio_caja, precio_cajon')
    .eq('lista_id', listaId)
  if (error) throw error
  return data
}

// precio_maple/precio_caja/precio_cajon son columnas independientes: no se
// derivan matemáticamente entre sí (ver TomarPedido.jsx).
export async function guardarItemsListaPrecio(listaId, filas) {
  const { error } = await supabase.from('lista_precio_items').upsert(
    filas.map((f) => ({ lista_id: listaId, ...f })),
    { onConflict: 'lista_id,producto_id' }
  )
  if (error) throw error
}
