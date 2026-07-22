import { supabase } from './supabase'

// saldo_clientes es una vista (cliente_id, nombre, saldo) que no expone
// teléfono — hay que traerlo aparte de clientes y mezclarlo acá.
export async function listarSaldosClientes() {
  const { data, error } = await supabase
    .from('saldo_clientes')
    .select('*')
    .gt('saldo', 0)
    .order('saldo', { ascending: false })
  if (error) throw error
  if (data.length === 0) return data

  const ids = data.map((c) => c.cliente_id)
  const { data: clientes, error: errorClientes } = await supabase.from('clientes').select('id, telefono').in('id', ids)
  if (errorClientes) throw errorClientes
  const telefonoPorId = Object.fromEntries(clientes.map((c) => [c.id, c.telefono]))

  return data.map((c) => ({ ...c, telefono: telefonoPorId[c.cliente_id] || null }))
}

// Saldo real del cliente (débitos - créditos, sin importar ningún filtro de
// fecha que se esté aplicando al listado de movimientos en pantalla).
export async function obtenerSaldoCliente(clienteId) {
  const { data, error } = await supabase.from('saldo_clientes').select('saldo').eq('cliente_id', clienteId).maybeSingle()
  if (error) throw error
  return data ? Number(data.saldo) : 0
}

export async function obtenerTotalesPagadosPorPedidos(pedidoIds) {
  if (pedidoIds.length === 0) return new Map()
  const { data, error } = await supabase.from('pagos').select('pedido_id, monto').in('pedido_id', pedidoIds)
  if (error) throw error
  const totales = new Map()
  for (const p of data) {
    totales.set(p.pedido_id, (totales.get(p.pedido_id) || 0) + Number(p.monto))
  }
  return totales
}

export async function autorizarExcepcionCC(pedidoId, montoExcepcion, motivo) {
  const { error } = await supabase.rpc('fn_autorizar_excepcion_cc', {
    p_pedido_id: pedidoId,
    p_monto_excepcion: montoExcepcion,
    p_motivo: motivo,
  })
  if (error) throw error
}

export async function obtenerUltimoPagoPedido(pedidoId) {
  const { data, error } = await supabase
    .from('pagos')
    .select('id, monto, medio, creado_at, pedido_id')
    .eq('pedido_id', pedidoId)
    .order('creado_at', { ascending: false })
    .limit(1)
    .single()
  if (error) throw error
  return data
}

export async function obtenerPago(id) {
  const { data, error } = await supabase
    .from('pagos')
    .select('*, pedidos(cliente_id, clientes(nombre))')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function obtenerTotalCobradoUltimos30Dias() {
  const desde = new Date()
  desde.setDate(desde.getDate() - 30)
  const { data, error } = await supabase.from('pagos').select('monto').gte('creado_at', desde.toISOString())
  if (error) throw error
  return data.reduce((acc, p) => acc + Number(p.monto), 0)
}

export async function listarExcepcionesCCDelMes() {
  const ahora = new Date()
  const desde = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString()
  const { data, error } = await supabase
    .from('excepciones_cuenta_corriente')
    .select('*, perfiles(nombre)')
    .gte('creado_at', desde)
    .order('creado_at', { ascending: false })
  if (error) throw error
  return data
}
