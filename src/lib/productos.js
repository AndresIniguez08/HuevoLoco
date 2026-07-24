import { supabase } from './supabase'

// La vista `stock_actual` (producto_id, stock_maple, stock_cajas, stock_cajones)
// ya trae el stock convertido a cada unidad; no recalcular acá.
export async function obtenerProductosConStock() {
  const { data: productos, error: errorProductos } = await supabase
    .from('productos')
    .select('*')
    .eq('activo', true)
    .order('nombre')
  if (errorProductos) throw errorProductos

  const { data: stock, error: errorStock } = await supabase.from('stock_actual').select('*')
  if (errorStock) throw errorStock

  const stockPorProducto = Object.fromEntries((stock || []).map((s) => [s.producto_id, s]))

  return productos.map((p) => {
    const stockInfo = stockPorProducto[p.id]
    return {
      ...p,
      stock_maple: stockInfo?.stock_maple ?? 0,
      stock_cajas: stockInfo?.stock_cajas ?? 0,
      stock_cajones: stockInfo?.stock_cajones ?? 0,
    }
  })
}

// Desglose de stock por producto, acotado a una sucursal: cajas (balde
// atómico independiente) y cajón + maple suelto (mismo balde — vender
// maples sueltos es abrir un cajón de a poco). Ver vista `stock_desglose`
// en el backend — trae una fila por producto + sucursal, así que siempre
// hay que filtrar por sucursal_id o se ven filas "duplicadas" del mismo
// producto en otras sucursales.
export async function obtenerStockDesgloseSucursal(sucursalId) {
  const { data, error } = await supabase
    .from('stock_desglose')
    .select('*')
    .eq('sucursal_id', sucursalId)
    .order('nombre')
  if (error) throw error
  return data
}

// Catálogo de una sucursal: solo los productos que Central habilitó para
// venderse ahí (producto_sucursal.habilitado). Distinto del catálogo
// completo que usa Central en TomarPedido/RegistrarCompra.
export async function obtenerProductosHabilitadosSucursal(sucursalId) {
  const { data, error } = await supabase
    .from('producto_sucursal')
    .select('productos(*)')
    .eq('sucursal_id', sucursalId)
    .eq('habilitado', true)
  if (error) throw error
  return (data || [])
    .map((fila) => fila.productos)
    .filter(Boolean)
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
}

// Para la pantalla de gestión: por defecto solo activos, con opción de
// incluir inactivos vía el filtro "mostrar inactivos".
export async function listarProductosGestion({ texto = '', incluirInactivos = false } = {}) {
  let query = supabase.from('productos').select('*').order('nombre')
  if (!incluirInactivos) query = query.eq('activo', true)
  if (texto) query = query.ilike('nombre', `%${texto}%`)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function crearProducto(datos) {
  const { error } = await supabase.from('productos').insert(datos)
  if (error) throw error
}

export async function actualizarProducto(id, datos) {
  const { error } = await supabase.from('productos').update(datos).eq('id', id)
  if (error) throw error
}

export async function actualizarEstadoProducto(id, activo) {
  const { error } = await supabase.from('productos').update({ activo }).eq('id', id)
  if (error) throw error
}

// Matriz para la pantalla de disponibilidad: productos activos, sucursales
// (menos Casa Central, que ya vende todo el catálogo por defecto) y las
// filas de producto_sucursal que ya existan. La ausencia de una fila para
// un par producto+sucursal significa "no habilitado" — no todas las
// combinaciones se crean de antemano.
export async function listarDisponibilidadSucursal() {
  const [{ data: productos, error: errorProductos }, { data: sucursales, error: errorSucursales }, { data: filas, error: errorFilas }] =
    await Promise.all([
      supabase.from('productos').select('id, nombre').eq('activo', true).order('nombre'),
      supabase.from('sucursales').select('id, nombre').neq('nombre', 'Casa Central').order('nombre'),
      supabase.from('producto_sucursal').select('producto_id, sucursal_id, habilitado'),
    ])
  if (errorProductos) throw errorProductos
  if (errorSucursales) throw errorSucursales
  if (errorFilas) throw errorFilas
  return { productos, sucursales, filas: filas || [] }
}

// mismo patrón de upsert que guardarItemsListaPrecio en lib/listasPrecio.js:
// crea la fila si es la primera vez que se habilita/deshabilita ese par.
export async function actualizarDisponibilidadSucursal(productoId, sucursalId, habilitado) {
  const { error } = await supabase
    .from('producto_sucursal')
    .upsert({ producto_id: productoId, sucursal_id: sucursalId, habilitado }, { onConflict: 'producto_id,sucursal_id' })
  if (error) throw error
}
