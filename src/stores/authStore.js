import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useAuthStore = create((set, get) => ({
  usuario: null,
  perfil: null,
  cargando: true,
  error: null,

  async inicializar() {
    const { data } = await supabase.auth.getSession()
    const usuario = data.session?.user ?? null
    if (usuario) {
      await get().cargarPerfil(usuario.id)
    }
    set({ usuario, cargando: false })

    supabase.auth.onAuthStateChange(async (_evento, sesion) => {
      const usuarioActual = sesion?.user ?? null
      set({ usuario: usuarioActual })
      if (usuarioActual) {
        await get().cargarPerfil(usuarioActual.id)
      } else {
        set({ perfil: null })
      }
    })
  },

  async cargarPerfil(usuarioId) {
    const { data, error } = await supabase
      .from('perfiles')
      .select('*')
      .eq('id', usuarioId)
      .single()
    if (error) {
      set({ perfil: null, error: 'No se pudo cargar tu perfil.' })
      return
    }
    set({ perfil: data, error: null })
  },

  async iniciarSesion(email, password) {
    set({ error: null })
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      set({ error: 'El email o la contraseña no son correctos.' })
      return { ok: false }
    }
    await get().cargarPerfil(data.user.id)
    set({ usuario: data.user })
    return { ok: true }
  },

  async cerrarSesion() {
    await supabase.auth.signOut()
    set({ usuario: null, perfil: null })
  },
}))
