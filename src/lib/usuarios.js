import { supabase } from './supabase'

export async function listarUsuarios() {
  const { data, error } = await supabase.from('perfiles').select('*, sucursales(nombre)').order('nombre')
  if (error) throw error
  return data
}

export async function actualizarEstadoUsuario(id, activo) {
  const { error } = await supabase.from('perfiles').update({ activo }).eq('id', id)
  if (error) throw error
}

export async function obtenerNombrePerfil(id) {
  if (!id) return null
  const { data, error } = await supabase.from('perfiles').select('nombre').eq('id', id).single()
  if (error) throw error
  return data.nombre
}

export async function crearUsuario({ email, password, nombre, rol, sucursal_id }) {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('Tu sesión expiró, iniciá sesión de nuevo.')

  const { data, error } = await supabase.functions.invoke('crear-usuario', {
    body: { email, password, nombre, rol, sucursal_id: sucursal_id || null },
  })
  if (error) throw new Error(error.message || 'No se pudo crear el usuario.')
  return data
}
