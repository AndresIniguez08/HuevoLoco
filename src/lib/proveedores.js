import { supabase } from './supabase'

// Por defecto excluye proveedores inactivos: esta función alimenta tanto el
// listado de gestión (con incluirInactivos) como selectores de otras
// pantallas (RegistrarCompra vía ProveedorSelector).
export async function listarProveedores({ texto = '', incluirInactivos = false, limite } = {}) {
  let query = supabase.from('proveedores').select('*').order('nombre')
  if (!incluirInactivos) query = query.eq('activo', true)
  if (texto) query = query.ilike('nombre', `%${texto}%`)
  if (limite) query = query.limit(limite)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function crearProveedor(datos) {
  const { error } = await supabase.from('proveedores').insert(datos)
  if (error) throw error
}

export async function actualizarProveedor(id, datos) {
  const { error } = await supabase.from('proveedores').update(datos).eq('id', id)
  if (error) throw error
}

export async function actualizarEstadoProveedor(id, activo) {
  const { error } = await supabase.from('proveedores').update({ activo }).eq('id', id)
  if (error) throw error
}

export async function obtenerProveedor(id) {
  const { data, error } = await supabase.from('proveedores').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

// saldo_proveedores es una vista (proveedor_id, nombre, saldo) — positivo
// significa que nosotros le debemos plata al proveedor.
export async function obtenerSaldoProveedor(proveedorId) {
  const { data, error } = await supabase
    .from('saldo_proveedores')
    .select('saldo')
    .eq('proveedor_id', proveedorId)
    .maybeSingle()
  if (error) throw error
  return data ? Number(data.saldo) : 0
}

// Para la columna "Saldo adeudado" del listado de gestión de proveedores.
export async function obtenerSaldosProveedores() {
  const { data, error } = await supabase.from('saldo_proveedores').select('proveedor_id, saldo')
  if (error) throw error
  return new Map(data.map((s) => [s.proveedor_id, Number(s.saldo)]))
}

export async function obtenerMovimientosCCProveedor(proveedorId, { desde, hasta } = {}) {
  let query = supabase
    .from('proveedor_cc_movimientos')
    .select('*')
    .eq('proveedor_id', proveedorId)
    .order('creado_at', { ascending: false })
  if (desde) query = query.gte('creado_at', `${desde}T00:00:00`)
  if (hasta) query = query.lte('creado_at', `${hasta}T23:59:59`)
  const { data, error } = await query
  if (error) throw error

  const idsCompra = data.filter((m) => m.referencia_tipo === 'compra').map((m) => m.referencia_id)
  const idsPago = data.filter((m) => m.referencia_tipo === 'pago').map((m) => m.referencia_id)

  const [comprasPorId, pagosPorId] = await Promise.all([
    obtenerMapaPorId('compras', 'id, creado_at', idsCompra),
    obtenerMapaPorId('pagos_proveedor', 'id, medio', idsPago),
  ])

  return data.map((m) => {
    if (m.referencia_tipo === 'compra') {
      const compra = comprasPorId.get(m.referencia_id)
      const fecha = compra ? new Date(compra.creado_at).toLocaleDateString('es-AR') : ''
      return { ...m, descripcion: `Compra — registrada el ${fecha}` }
    }
    if (m.referencia_tipo === 'pago') {
      const pago = pagosPorId.get(m.referencia_id)
      return { ...m, descripcion: `Pago a proveedor${pago?.medio ? ` — ${pago.medio}` : ''}` }
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

// Detalle de líneas de una compra, para el desplegable de un movimiento tipo
// "compra" en la cuenta corriente del proveedor. compra_items no guarda la
// unidad de venta original: siempre está en maples.
export async function obtenerItemsCompra(compraId) {
  const { data, error } = await supabase
    .from('compra_items')
    .select('id, cantidad_maple, costo_unitario, productos(nombre)')
    .eq('compra_id', compraId)
  if (error) throw error
  return data
}

export async function obtenerDetallePagoProveedor(pagoId) {
  const { data, error } = await supabase
    .from('pagos_proveedor')
    .select('id, monto, medio, creado_at, perfiles(nombre)')
    .eq('id', pagoId)
    .single()
  if (error) throw error
  return data
}

// Para el select opcional de "qué compra puntual está pagando" en el modal
// de registrar pago a proveedor.
export async function listarComprasProveedor(proveedorId) {
  const { data, error } = await supabase
    .from('compras')
    .select('id, creado_at, total')
    .eq('proveedor_id', proveedorId)
    .order('creado_at', { ascending: false })
    .limit(30)
  if (error) throw error
  return data
}

export async function registrarPagoProveedor(proveedorId, compraId, monto, medio) {
  const { error } = await supabase.rpc('fn_registrar_pago_proveedor', {
    p_proveedor_id: proveedorId,
    p_compra_id: compraId || null,
    p_monto: monto,
    p_medio: medio,
  })
  if (error) throw error
}
