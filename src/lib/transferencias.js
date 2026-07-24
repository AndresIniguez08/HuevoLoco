import { supabase } from './supabase'

export async function listarSucursales() {
  const { data, error } = await supabase.from('sucursales').select('*').order('nombre')
  if (error) throw error
  return data
}

export async function crearRemitoTransferencia(sucursalDestinoId, items) {
  const { data, error } = await supabase.rpc('fn_crear_remito_transferencia', {
    p_sucursal_destino_id: sucursalDestinoId,
    p_items: items,
  })
  if (error) throw error
  return data
}

// remitos_transferencia tiene tres FKs hacia perfiles (usuario_id,
// aceptado_por, revisado_por) y dos hacia sucursales (sucursal_origen_id,
// sucursal_destino_id) — sin el hint !fk_constraint, PostgREST no puede
// resolver el embed y tira PGRST201.
const SELECT_REMITO = `
  *,
  sucursales!remitos_transferencia_sucursal_destino_id_fkey (nombre),
  creador:perfiles!remitos_transferencia_usuario_id_fkey (nombre),
  receptor:perfiles!remitos_transferencia_aceptado_por_fkey (nombre),
  revisor:perfiles!remitos_transferencia_revisado_por_fkey (nombre)
`

export async function listarRemitosTransferencia() {
  const { data, error } = await supabase
    .from('remitos_transferencia')
    .select(SELECT_REMITO)
    .order('creado_at', { ascending: false })
  if (error) throw error
  return data
}

export async function obtenerRemitoTransferencia(id) {
  const { data, error } = await supabase
    .from('remitos_transferencia')
    .select(
      `${SELECT_REMITO}, remito_transferencia_items(id, cantidad_maple, unidad_transaccion, cantidad_unidad, productos(nombre))`
    )
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

// Cola de recepción de la sucursal: solo lo que todavía está en tránsito.
// Una vez aceptado o reportado con diferencia, sale de acá.
export async function listarRemitosPendientesSucursal(sucursalId) {
  const { data, error } = await supabase
    .from('remitos_transferencia')
    .select(
      '*, remito_transferencia_items(id, cantidad_maple, unidad_transaccion, cantidad_unidad, productos(nombre))'
    )
    .eq('sucursal_destino_id', sucursalId)
    .eq('estado', 'enviado')
    .order('creado_at', { ascending: true })
  if (error) throw error
  return data
}

export async function aceptarRemito(remitoId) {
  const { error } = await supabase.rpc('fn_aceptar_remito', { p_remito_id: remitoId })
  if (error) throw error
}

export async function reportarDiferenciaRemito(remitoId, observacion) {
  const { error } = await supabase.rpc('fn_reportar_diferencia_remito', {
    p_remito_id: remitoId,
    p_observacion: observacion,
  })
  if (error) throw error
}

export async function contarRemitosDiferenciaSinRevisar() {
  const { count, error } = await supabase
    .from('remitos_transferencia')
    .select('*', { count: 'exact', head: true })
    .eq('estado', 'con_diferencia')
    .eq('revisado', false)
  if (error) throw error
  return count || 0
}

export async function revisarRemito(remitoId) {
  const { error } = await supabase.rpc('fn_revisar_remito', { p_remito_id: remitoId })
  if (error) throw error
}
