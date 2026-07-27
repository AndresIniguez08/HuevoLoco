import { supabase } from './supabase'

// Por defecto excluye categorías inactivas: alimenta tanto el listado de
// gestión (con incluirInactivas) como el selector de Alta/Editar producto
// (listarCategoriasActivas).
export async function listarCategoriasProducto({ texto = '', incluirInactivas = false } = {}) {
  let query = supabase.from('categorias_producto').select('*').order('nombre')
  if (!incluirInactivas) query = query.eq('activo', true)
  if (texto) query = query.ilike('nombre', `%${texto}%`)
  const { data, error } = await query
  if (error) throw error
  return data
}

// Para el <select> de Alta/Editar producto: solo id + nombre, siempre activas.
export async function listarCategoriasActivas() {
  const { data, error } = await supabase
    .from('categorias_producto')
    .select('id, nombre')
    .eq('activo', true)
    .order('nombre')
  if (error) throw error
  return data
}

export async function crearCategoriaProducto(datos) {
  const { error } = await supabase.from('categorias_producto').insert(datos)
  if (error) throw error
}

export async function actualizarCategoriaProducto(id, datos) {
  const { error } = await supabase.from('categorias_producto').update(datos).eq('id', id)
  if (error) throw error
}

export async function actualizarEstadoCategoria(id, activo) {
  const { error } = await supabase.from('categorias_producto').update({ activo }).eq('id', id)
  if (error) throw error
}
