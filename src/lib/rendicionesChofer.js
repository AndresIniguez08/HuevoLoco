import { supabase } from './supabase'

export async function listarChoferes() {
  const { data, error } = await supabase.from('perfiles').select('*').eq('rol', 'chofer').eq('activo', true).order('nombre')
  if (error) throw error
  return data
}

export async function listarRendicionesDeHoy() {
  const hoy = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase.from('rendiciones_chofer').select('*').gte('creado_at', `${hoy}T00:00:00`)
  if (error) throw error
  return data
}

export async function crearRendicionChofer(choferId) {
  const { error } = await supabase.rpc('fn_crear_rendicion_chofer', { p_chofer_id: choferId })
  if (error) throw error
}

export async function cerrarRendicionChofer(rendicionId, montoEntregado) {
  const { error } = await supabase.rpc('fn_cerrar_rendicion_chofer', {
    p_rendicion_id: rendicionId,
    p_monto_entregado: montoEntregado,
  })
  if (error) throw error
}

export async function listarRendicionesCerradas() {
  const { data, error } = await supabase
    .from('rendiciones_chofer')
    .select(`
      *,
      chofer:perfiles!rendiciones_chofer_chofer_id_fkey (nombre),
      receptor:perfiles!rendiciones_chofer_recibido_por_fkey (nombre)
    `)
    .not('monto_entregado', 'is', null)
    .order('creado_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data
}
