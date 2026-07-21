import { supabase } from './supabase'

// Por defecto excluye camionetas inactivas: alimenta tanto el listado de
// gestión (con incluirInactivos) como selectores de otras pantallas
// (AsignarReparto).
export async function listarCamionetas({ texto = '', incluirInactivos = false } = {}) {
  let query = supabase.from('camionetas').select('*').order('nombre')
  if (!incluirInactivos) query = query.eq('activo', true)
  if (texto) query = query.ilike('nombre', `%${texto}%`)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function crearCamioneta(datos) {
  const { error } = await supabase.from('camionetas').insert(datos)
  if (error) throw error
}

export async function actualizarCamioneta(id, datos) {
  const { error } = await supabase.from('camionetas').update(datos).eq('id', id)
  if (error) throw error
}

export async function actualizarEstadoCamioneta(id, activo) {
  const { error } = await supabase.from('camionetas').update({ activo }).eq('id', id)
  if (error) throw error
}
