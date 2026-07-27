import { supabase } from './supabase'
import { formatearMoneda } from './formato'

export async function obtenerMovimientosCaja({ desde, hasta, sucursalId } = {}) {
  const hoy = new Date().toISOString().slice(0, 10)
  let query = supabase
    .from('caja_movimientos')
    .select('*')
    .order('creado_at', { ascending: false })
    .gte('creado_at', `${desde || hoy}T00:00:00`)
  if (hasta) query = query.lte('creado_at', `${hasta}T23:59:59`)
  if (sucursalId) query = query.eq('sucursal_id', sucursalId)
  const { data, error } = await query
  if (error) throw error

  const idsPago = data.filter((m) => m.concepto === 'cobro_venta').map((m) => m.referencia_id)
  const idsPagoProveedor = data.filter((m) => m.concepto === 'pago_proveedor').map((m) => m.referencia_id)

  const [pagosPorId, pagosProveedorPorId] = await Promise.all([
    obtenerMapaPorId('pagos', 'id, clientes(nombre)', idsPago),
    obtenerMapaPorId('pagos_proveedor', 'id, proveedores(nombre)', idsPagoProveedor),
  ])

  return data.map((m) => ({ ...m, descripcion: describirMovimiento(m, pagosPorId, pagosProveedorPorId) }))
}

// Fallback intencional: un concepto que todavía no mapeamos se muestra tal
// cual viene de la base en vez de romper la pantalla.
function describirMovimiento(m, pagosPorId, pagosProveedorPorId) {
  if (m.concepto === 'cobro_venta') {
    const nombreCliente = pagosPorId.get(m.referencia_id)?.clientes?.nombre
    return `Cobranza${nombreCliente ? ` — ${nombreCliente}` : ''}`
  }
  if (m.concepto === 'pago_proveedor') {
    const nombreProveedor = pagosProveedorPorId.get(m.referencia_id)?.proveedores?.nombre
    return `Pago a proveedor${nombreProveedor ? ` — ${nombreProveedor}` : ''}`
  }
  return m.concepto || '—'
}

async function obtenerMapaPorId(tabla, columnas, ids) {
  if (ids.length === 0) return new Map()
  const { data, error } = await supabase.from(tabla).select(columnas).in('id', ids)
  if (error) throw error
  return new Map(data.map((fila) => [fila.id, fila]))
}

// fn_registrar_movimiento_caja_manual ya resuelve sola la sucursal (Casa
// Central para dueño/administrativo, la propia para encargado_sucursal) —
// no se le pasa como parámetro. Como caja_movimientos ya es la fuente de
// "Caja de hoy" y del esperado del arqueo, no hace falta tocar esas
// pantallas para que el movimiento quede reflejado ahí.
export async function crearMovimientoCajaManual(tipo, monto, concepto, medio) {
  const { data, error } = await supabase.rpc('fn_registrar_movimiento_caja_manual', {
    p_tipo: tipo,
    p_monto: monto,
    p_concepto: concepto,
    p_medio: medio,
  })
  if (error) throw error
  return data
}

// Para el comprobante imprimible. Se resuelve con consultas separadas (no un
// embed) porque no está confirmado si caja_movimientos tiene un solo FK
// hacia perfiles — mismo criterio defensivo que obtenerMapaPorId más arriba,
// evita el PGRST201 de embeds ambiguos si en algún momento hay más de uno.
export async function obtenerMovimientoCaja(id) {
  const { data: movimiento, error } = await supabase.from('caja_movimientos').select('*').eq('id', id).single()
  if (error) throw error

  const [{ data: perfil }, { data: sucursal }] = await Promise.all([
    supabase.from('perfiles').select('nombre').eq('id', movimiento.usuario_id).maybeSingle(),
    supabase.from('sucursales').select('nombre').eq('id', movimiento.sucursal_id).maybeSingle(),
  ])

  return { ...movimiento, usuario_nombre: perfil?.nombre || null, sucursal_nombre: sucursal?.nombre || null }
}

// Solo lo cargado a mano hoy (referencia_tipo = 'manual'). Reutiliza
// obtenerMovimientosCaja (ya trae solo el día de hoy, filtrado por sucursal,
// con la descripción ya armada) y filtra el resultado.
export async function listarMovimientosManualesHoy(sucursalId) {
  const movimientos = await obtenerMovimientosCaja({ sucursalId })
  return movimientos.filter((m) => m.referencia_tipo === 'manual')
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
  if (diferencia > 0) return { texto: `Sobrante de ${formatearMoneda(diferencia)}`, clase: 'text-yema' }
  return { texto: `Faltante de ${formatearMoneda(Math.abs(diferencia))}`, clase: 'text-perdida' }
}
