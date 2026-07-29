import { supabase } from './supabase'

// Para pantallas fuera de dueño que necesitan el nombre de un producto ya
// asociado a otro registro (ítem de pedido, remito, pérdida, conteo...): la
// RLS de `productos` ahora es exclusiva de dueño, así que un embed
// `productos(nombre)` por FK vuelve null para el resto de los roles. Esta
// función arma el mapa id->{nombre} a mano contra `productos_publico`, para
// pegar en JS en vez de embeber.
export async function obtenerNombresProductos(ids) {
  const idsUnicos = [...new Set(ids)].filter(Boolean)
  if (idsUnicos.length === 0) return new Map()
  const { data, error } = await supabase.from('productos_publico').select('id, nombre').in('id', idsUnicos)
  if (error) throw error
  return new Map((data || []).map((p) => [p.id, p]))
}

// La vista `stock_actual` (producto_id, stock_maple, stock_cajas, stock_cajones)
// ya trae el stock convertido a cada unidad; no recalcular acá.
// Usa `productos_publico` (sin costo_promedio) en vez de `productos`: esta
// función alimenta selectores de producto (TomarPedido, RegistrarCompra) que
// no necesitan el costo y no deben poder filtrarlo sin querer con un select('*').
export async function obtenerProductosConStock() {
  const { data: productos, error: errorProductos } = await supabase
    .from('productos_publico')
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

// Stock para StockGeneral.jsx: TODOS los productos activos (huevo y no), con
// su stock resuelto según corresponda, en UNA sucursal puntual (sucursalId)
// o en TODAS (sucursalId null — sin filtrar, para el selector "Todas").
// stock_actual y stock_desglose tienen sucursal_id cada una, con una fila
// por producto+sucursal — de ahí sale directo qué productos "existen" en
// cada sucursal, sin necesidad de otra tabla. Huevo sigue viniendo del
// desglose (cajones/cajas/maples_sueltos, igual que siempre en
// StockSucursal/StockActual) — no-huevo no tiene ese desglose, así que se
// queda con el total simple de stock_actual (stock_maple, reutilizado acá
// como "cantidad en unidad_base"). Devuelve una fila por (producto,
// sucursal) — agrupar por sucursal_id queda del lado de la pantalla.
export async function obtenerStockGeneralPorSucursal(sucursalId = null) {
  let queryStockActual = supabase.from('stock_actual').select('*')
  let queryDesglose = supabase.from('stock_desglose').select('*')
  if (sucursalId) {
    queryStockActual = queryStockActual.eq('sucursal_id', sucursalId)
    queryDesglose = queryDesglose.eq('sucursal_id', sucursalId)
  }

  const [
    { data: productos, error: errorProductos },
    { data: stockActual, error: errorStockActual },
    { data: desglose, error: errorDesglose },
  ] = await Promise.all([
    supabase.from('productos_publico').select('*').eq('activo', true),
    queryStockActual,
    queryDesglose,
  ])
  if (errorProductos) throw errorProductos
  if (errorStockActual) throw errorStockActual
  if (errorDesglose) throw errorDesglose

  const productosPorId = Object.fromEntries((productos || []).map((p) => [p.id, p]))
  const filas = []

  for (const d of desglose || []) {
    const producto = productosPorId[d.producto_id]
    if (!producto || producto.es_huevo === false) continue
    filas.push({ ...producto, sucursal_id: d.sucursal_id, desglose: d })
  }
  for (const s of stockActual || []) {
    const producto = productosPorId[s.producto_id]
    if (!producto || producto.es_huevo !== false) continue
    filas.push({ ...producto, sucursal_id: s.sucursal_id, stock_maple: s.stock_maple })
  }

  return filas
}

// Catálogo de una sucursal: solo los productos que Central habilitó para
// venderse ahí (producto_sucursal.habilitado). Distinto del catálogo
// completo que usa Central en TomarPedido/RegistrarCompra. Se arma con dos
// consultas (en vez de un embed producto_sucursal->productos) para poder
// traer los datos desde `productos_publico` y no desde `productos`: un embed
// sigue la FK real hacia `productos`, que incluye costo_promedio.
export async function obtenerProductosHabilitadosSucursal(sucursalId) {
  const { data: filas, error: errorFilas } = await supabase
    .from('producto_sucursal')
    .select('producto_id')
    .eq('sucursal_id', sucursalId)
    .eq('habilitado', true)
  if (errorFilas) throw errorFilas

  const idsProducto = (filas || []).map((f) => f.producto_id)
  if (idsProducto.length === 0) return []

  const { data: productos, error: errorProductos } = await supabase
    .from('productos_publico')
    .select('*')
    .in('id', idsProducto)
    .order('nombre')
  if (errorProductos) throw errorProductos
  return productos || []
}

// Catálogo + stock de una sucursal puntual, para pantallas donde un
// encargado de sucursal necesita ver SU PROPIO stock disponible (no el del
// depósito central, que es lo que trae obtenerProductosConStock). A
// diferencia de stock_actual, stock_desglose no viene pre-convertido a un
// único "stock_maple" — se muestran los 3 baldes tal cual (cajones, cajas,
// maples sueltos), igual que en StockSucursal/StockActual.
export async function obtenerProductosConStockSucursal(sucursalId) {
  const [productos, desglose] = await Promise.all([
    obtenerProductosHabilitadosSucursal(sucursalId),
    obtenerStockDesgloseSucursal(sucursalId),
  ])
  const stockPorProducto = Object.fromEntries(desglose.map((d) => [d.producto_id, d]))
  return productos.map((p) => {
    const stock = stockPorProducto[p.id]
    return {
      ...p,
      stock_cajones: stock?.cajones ?? 0,
      stock_cajas: stock?.cajas ?? 0,
      stock_maples_sueltos: stock?.maples_sueltos ?? 0,
    }
  })
}

// Para la pantalla de gestión: por defecto solo activos, con opción de
// incluir inactivos vía el filtro "mostrar inactivos". Dueño y administrativo
// entran acá, así que usa `productos_publico` (RLS de `productos` ahora es
// exclusiva de dueño). El nombre de categoría se trae aparte y se pega en JS
// en vez de embeber `categorias_producto(nombre)`: un embed sigue la FK real
// hacia `productos`, y sobre la vista puede no resolver.
export async function listarProductosGestion({ texto = '', incluirInactivos = false } = {}) {
  let query = supabase.from('productos_publico').select('*').order('nombre')
  if (!incluirInactivos) query = query.eq('activo', true)
  if (texto) query = query.ilike('nombre', `%${texto}%`)
  const { data: productos, error } = await query
  if (error) throw error
  if (!productos || productos.length === 0) return []

  const idsCategoria = [...new Set(productos.map((p) => p.categoria_id).filter(Boolean))]
  if (idsCategoria.length === 0) return productos

  const { data: categorias, error: errorCategorias } = await supabase
    .from('categorias_producto')
    .select('id, nombre')
    .in('id', idsCategoria)
  if (errorCategorias) throw errorCategorias
  const categoriaPorId = new Map((categorias || []).map((c) => [c.id, c]))

  return productos.map((p) => ({
    ...p,
    categorias_producto: p.categoria_id ? categoriaPorId.get(p.categoria_id) : null,
  }))
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
// combinaciones se crean de antemano. Dueño y administrativo entran acá, por
// eso `productos_publico` en vez de `productos`.
export async function listarDisponibilidadSucursal() {
  const [{ data: productos, error: errorProductos }, { data: sucursales, error: errorSucursales }, { data: filas, error: errorFilas }] =
    await Promise.all([
      supabase.from('productos_publico').select('id, nombre').eq('activo', true).order('nombre'),
      supabase
        .from('sucursales')
        .select('id, nombre, permite_venta_sin_stock')
        .neq('nombre', 'Casa Central')
        .order('nombre'),
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
