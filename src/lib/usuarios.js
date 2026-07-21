import { supabase } from './supabase'

export async function listarUsuarios() {
  const { data, error } = await supabase.from('perfiles').select('*').order('nombre')
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

export async function crearUsuario({ email, password, nombre, rol }) {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('Tu sesión expiró, iniciá sesión de nuevo.')

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crear-usuario`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ email, password, nombre, rol }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'No se pudo crear el usuario.')
  return data
}
