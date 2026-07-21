import { supabase } from './supabase'

// Por defecto excluye clientes inactivos: esta función alimenta los
// selectores de pantallas de operación (TomarPedido, CuentaCorriente, etc.).
// Pasar { incluirInactivos: true } solo desde pantallas de gestión.
export async function buscarClientes(texto, { incluirInactivos = false } = {}) {
  let query = supabase.from('clientes').select('*').order('nombre').limit(20)
  if (!incluirInactivos) query = query.eq('activo', true)
  if (texto) query = query.ilike('nombre', `%${texto}%`)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function crearCliente(datos) {
  const { error } = await supabase.from('clientes').insert(datos)
  if (error) throw error
}

export async function actualizarCliente(id, datos) {
  const { error } = await supabase.from('clientes').update(datos).eq('id', id)
  if (error) throw error
}

export async function actualizarEstadoCliente(id, activo) {
  const { error } = await supabase.from('clientes').update({ activo }).eq('id', id)
  if (error) throw error
}

export async function autorizarCuentaCorriente(clienteId, limiteCredito) {
  const { error } = await supabase.rpc('fn_autorizar_cuenta_corriente', {
    p_cliente_id: clienteId,
    p_limite_credito: limiteCredito,
  })
  if (error) throw error
}

export async function revocarCuentaCorriente(clienteId) {
  const { error } = await supabase.rpc('fn_revocar_cuenta_corriente', { p_cliente_id: clienteId })
  if (error) throw error
}

export async function obtenerCliente(id) {
  const { data, error } = await supabase.from('clientes').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function obtenerPedidosCliente(clienteId) {
  const { data, error } = await supabase
    .from('pedidos')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('creado_at', { ascending: false })
    .limit(20)
  if (error) throw error
  return data
}

// Aproximación de "desde cuándo arrastra saldo": el pedido más antiguo que
// todavía no está pagado. No hay conciliación por factura, así que esto es
// solo para dar contexto al vendedor, no un dato contable exacto.
export async function obtenerFechaInicioSaldoPendiente(clienteId) {
  const { data, error } = await supabase
    .from('pedidos')
    .select('creado_at')
    .eq('cliente_id', clienteId)
    .neq('estado_pago', 'pagado')
    .order('creado_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data?.creado_at || null
}

// Misma aproximación que obtenerFechaInicioSaldoPendiente, pero para varios
// clientes a la vez (ej. cada fila de la lista de pedidos del día).
export async function obtenerFechasInicioSaldoPendiente(clienteIds) {
  if (clienteIds.length === 0) return new Map()
  const { data, error } = await supabase
    .from('pedidos')
    .select('cliente_id, creado_at')
    .in('cliente_id', clienteIds)
    .neq('estado_pago', 'pagado')
    .order('creado_at', { ascending: true })
  if (error) throw error
  const fechas = new Map()
  for (const p of data) {
    if (!fechas.has(p.cliente_id)) fechas.set(p.cliente_id, p.creado_at)
  }
  return fechas
}

export async function obtenerMovimientosCuentaCorriente(clienteId, { desde, hasta } = {}) {
  let query = supabase
    .from('cuenta_corriente_movimientos')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('creado_at', { ascending: false })
  if (desde) query = query.gte('creado_at', `${desde}T00:00:00`)
  if (hasta) query = query.lte('creado_at', `${hasta}T23:59:59`)
  const { data, error } = await query
  if (error) throw error

  const idsVenta = data.filter((m) => m.referencia_tipo === 'venta').map((m) => m.referencia_id)
  const idsPago = data.filter((m) => m.referencia_tipo === 'pago').map((m) => m.referencia_id)

  const [pedidosPorId, pagosPorId] = await Promise.all([
    obtenerMapaPorId('pedidos', 'id, creado_at', idsVenta),
    obtenerMapaPorId('pagos', 'id, medio', idsPago),
  ])

  return data.map((m) => {
    if (m.referencia_tipo === 'venta') {
      const pedido = pedidosPorId.get(m.referencia_id)
      const fecha = pedido ? new Date(pedido.creado_at).toLocaleDateString('es-AR') : ''
      return { ...m, descripcion: `Venta — pedido del ${fecha}` }
    }
    if (m.referencia_tipo === 'pago') {
      const pago = pagosPorId.get(m.referencia_id)
      return { ...m, descripcion: `Pago recibido${pago?.medio ? ` — ${pago.medio}` : ''}` }
    }
    return m
  })
}

async function obtenerMapaPorId(tabla, columnas, ids) {
  if (ids.length === 0) return new Map()
  const { data, error } = await supabase.from(tabla).select(columnas).in('id', ids)
  if (error) throw error
  return new Map(data.map((fila) => [fila.id, fila]))
}
