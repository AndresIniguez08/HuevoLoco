import { supabase } from './supabase'

export async function obtenerMovimientosCaja({ desde, hasta } = {}) {
  const hoy = new Date().toISOString().slice(0, 10)
  let query = supabase
    .from('caja_movimientos')
    .select('*')
    .order('creado_at', { ascending: false })
    .gte('creado_at', `${desde || hoy}T00:00:00`)
  if (hasta) query = query.lte('creado_at', `${hasta}T23:59:59`)
  const { data, error } = await query
  if (error) throw error
  return data
}

export function totalesPorMedio(movimientos) {
  const totales = {}
  for (const m of movimientos) {
    const signo = m.tipo === 'egreso' ? -1 : 1
    totales[m.medio] = (totales[m.medio] || 0) + signo * Number(m.monto)
  }
  return totales
}

export async function obtenerArqueo(id) {
  const { data, error } = await supabase.from('caja_arqueos').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

// Un sobrante no es necesariamente un error grave (podría ser vuelto de más,
// un cambio no registrado, etc.) — se distingue de un faltante, que sí es la
// señal de alerta real. Usado tanto en pantalla como en la hoja impresa.
export function formatearDiferencia(diferencia) {
  if (diferencia === 0) return { texto: 'Sin diferencia', clase: 'text-fresco' }
  if (diferencia > 0) return { texto: `Sobrante de $${diferencia.toLocaleString('es-AR')}`, clase: 'text-yema' }
  return { texto: `Faltante de $${Math.abs(diferencia).toLocaleString('es-AR')}`, clase: 'text-perdida' }
}
