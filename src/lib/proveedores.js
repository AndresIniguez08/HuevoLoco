import { supabase } from './supabase'

// Por defecto excluye proveedores inactivos: esta función alimenta tanto el
// listado de gestión (con incluirInactivos) como selectores de otras
// pantallas (RegistrarCompra vía ProveedorSelector).
export async function listarProveedores({ texto = '', incluirInactivos = false } = {}) {
  let query = supabase.from('proveedores').select('*').order('nombre')
  if (!incluirInactivos) query = query.eq('activo', true)
  if (texto) query = query.ilike('nombre', `%${texto}%`)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function crearProveedor(datos) {
  const { error } = await supabase.from('proveedores').insert(datos)
  if (error) throw error
}

export async function actualizarProveedor(id, datos) {
  const { error } = await supabase.from('proveedores').update(datos).eq('id', id)
  if (error) throw error
}

export async function actualizarEstadoProveedor(id, activo) {
  const { error } = await supabase.from('proveedores').update({ activo }).eq('id', id)
  if (error) throw error
}
