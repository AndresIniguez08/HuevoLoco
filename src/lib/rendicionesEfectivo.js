import { supabase } from './supabase'

// rendiciones_efectivo tiene dos FKs hacia perfiles (usuario_creador_id,
// usuario_confirma_id) — sin el hint !constraint, PostgREST no puede
// resolver el embed y tira PGRST201 (mismo patrón que remitos_transferencia
// en lib/transferencias.js).
const SELECT_RENDICION = `
  *,
  sucursales(nombre),
  creador:perfiles!rendiciones_efectivo_usuario_creador_id_fkey(nombre),
  confirmador:perfiles!rendiciones_efectivo_usuario_confirma_id_fkey(nombre)
`

export async function obtenerFondoFijoSucursal(sucursalId) {
  const { data, error } = await supabase.from('sucursales').select('fondo_fijo').eq('id', sucursalId).single()
  if (error) throw error
  return Number(data.fondo_fijo) || 0
}

// Saldo de efectivo acumulado de la sucursal: suma de todos los
// caja_movimientos con medio='efectivo' (ingresos - egresos), sin filtro de
// fecha — la rendición no está atada al día ni al arqueo, así que tiene que
// ver todo lo acumulado desde la última vez que se rindió. Cuando se confirma
// una rendición, eso genera su propio caja_movimientos de egreso (a cargo del
// backend), por lo que este saldo ya queda neto para la siguiente vez.
export async function obtenerSaldoEfectivoSucursal(sucursalId) {
  const { data, error } = await supabase
    .from('caja_movimientos')
    .select('tipo, monto')
    .eq('sucursal_id', sucursalId)
    .eq('medio', 'efectivo')
  if (error) throw error
  return data.reduce((acc, m) => acc + (m.tipo === 'egreso' ? -1 : 1) * Number(m.monto), 0)
}

// fn_crear_rendicion_efectivo valida contra el saldo real de efectivo en
// caja — si p_monto_declarado lo supera, tira un error con un mensaje ya
// claro (ver esErrorSuperaDisponible en las pantallas que lo consumen).
export async function crearRendicionEfectivo(sucursalId, montoDeclarado, observaciones) {
  const { data, error } = await supabase.rpc('fn_crear_rendicion_efectivo', {
    p_sucursal_id: sucursalId,
    p_monto_declarado: montoDeclarado,
    p_observaciones: observaciones || null,
  })
  if (error) throw error
  return data
}

export async function confirmarRendicionEfectivo(rendicionId, montoRecibido, observacionesConfirmacion) {
  const { error } = await supabase.rpc('fn_confirmar_rendicion_efectivo', {
    p_rendicion_id: rendicionId,
    p_monto_recibido: montoRecibido,
    p_observaciones_confirmacion: observacionesConfirmacion || null,
  })
  if (error) throw error
}

export async function listarRendicionesPendientes() {
  const { data, error } = await supabase
    .from('rendiciones_efectivo')
    .select(SELECT_RENDICION)
    .eq('estado', 'pendiente')
    .order('fecha_envio', { ascending: true })
  if (error) throw error
  return data
}

export async function listarRendicionesHistorial() {
  const { data, error } = await supabase
    .from('rendiciones_efectivo')
    .select(SELECT_RENDICION)
    .in('estado', ['confirmada', 'confirmada_con_diferencia'])
    .order('fecha_confirmacion', { ascending: false })
  if (error) throw error
  return data
}

export async function obtenerRendicion(id) {
  const { data, error } = await supabase.from('rendiciones_efectivo').select(SELECT_RENDICION).eq('id', id).single()
  if (error) throw error
  return data
}
