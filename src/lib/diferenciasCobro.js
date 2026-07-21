import { supabase } from './supabase'

export async function contarDiferenciasSinRevisar() {
  const { count, error } = await supabase
    .from('diferencias_cobro')
    .select('*', { count: 'exact', head: true })
    .eq('revisado', false)
  if (error) throw error
  return count || 0
}

export async function listarDiferenciasCobro() {
  const { data, error } = await supabase
    .from('diferencias_cobro')
    .select(`
      *,
      pedidos (cliente_id, clientes (nombre)),
      chofer:perfiles!diferencias_cobro_chofer_id_fkey (nombre),
      revisor:perfiles!diferencias_cobro_revisado_por_fkey (nombre)
    `)
    .order('revisado', { ascending: true })
    .order('creado_at', { ascending: false })
  if (error) throw error
  return data
}

export async function marcarDiferenciaRevisada(id) {
  const { error } = await supabase.rpc('fn_revisar_diferencia_cobro', { p_diferencia_id: id })
  if (error) throw error
}
