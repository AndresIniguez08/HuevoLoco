import { supabase } from './supabase'

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
