import { supabase } from './supabase'

// Paso 1 (dueño/administrativo/depósito): registra lo que llegó del
// proveedor, sin costo — fn_registrar_recepcion_compra crea la compra
// directamente en estado 'recibida'. Ya no hay una orden previa esperando
// confirmación: quien recibe la mercadería carga acá mismo lo que llegó.
export async function registrarRecepcionCompra(proveedorId, items) {
  const { data, error } = await supabase.rpc('fn_registrar_recepcion_compra', {
    p_proveedor_id: proveedorId,
    p_items: items,
  })
  if (error) throw error
  return data
}

// recepciones_compra / recepcion_compra_items son vistas sin columna de
// costo — las usan dueño/administrativo/depósito para ver qué se recibió,
// sin ningún riesgo de exponer precios. Se arman los joins a mano (en vez
// de embeds de PostgREST) porque acá son vistas, no tablas con FK real.
export async function listarRecepcionesRecientes(limite = 20) {
  const { data: recepciones, error } = await supabase
    .from('recepciones_compra')
    .select('*')
    .order('creado_at', { ascending: false })
    .limit(limite)
  if (error) throw error
  if (!recepciones || recepciones.length === 0) return []

  const idsProveedor = [...new Set(recepciones.map((r) => r.proveedor_id))]
  const idsCompra = recepciones.map((r) => r.id)

  const [{ data: proveedores, error: errorProv }, { data: items, error: errorItems }] = await Promise.all([
    supabase.from('proveedores').select('id, nombre').in('id', idsProveedor),
    supabase.from('recepcion_compra_items').select('*').in('compra_id', idsCompra),
  ])
  if (errorProv) throw errorProv
  if (errorItems) throw errorItems

  const idsProducto = [...new Set((items || []).map((it) => it.producto_id))]
  const { data: productos, error: errorProd } = await supabase
    .from('productos_publico')
    .select('id, nombre')
    .in('id', idsProducto)
  if (errorProd) throw errorProd

  const proveedorPorId = new Map((proveedores || []).map((p) => [p.id, p]))
  const productoPorId = new Map((productos || []).map((p) => [p.id, p]))
  const itemsPorCompra = new Map()
  for (const it of items || []) {
    const lista = itemsPorCompra.get(it.compra_id) || []
    lista.push({ ...it, productos: productoPorId.get(it.producto_id) })
    itemsPorCompra.set(it.compra_id, lista)
  }

  return recepciones.map((r) => ({
    ...r,
    proveedores: proveedorPorId.get(r.proveedor_id),
    items: itemsPorCompra.get(r.id) || [],
  }))
}

// Comprobante de una recepción puntual (para /compra/:id/imprimir), también
// sin costo — se imprime justo después de recibir, antes de que dueño cargue
// el costo.
export async function obtenerRecepcionParaImprimir(compraId) {
  const { data: recepcion, error } = await supabase
    .from('recepciones_compra')
    .select('*')
    .eq('id', compraId)
    .single()
  if (error) throw error

  const [{ data: proveedor, error: errorProv }, { data: items, error: errorItems }] = await Promise.all([
    supabase.from('proveedores').select('nombre').eq('id', recepcion.proveedor_id).single(),
    supabase.from('recepcion_compra_items').select('*').eq('compra_id', compraId),
  ])
  if (errorProv) throw errorProv
  if (errorItems) throw errorItems

  const idsProducto = [...new Set((items || []).map((it) => it.producto_id))]
  const { data: productos, error: errorProd } = await supabase
    .from('productos_publico')
    .select('id, nombre')
    .in('id', idsProducto)
  if (errorProd) throw errorProd
  const productoPorId = new Map((productos || []).map((p) => [p.id, p]))

  return {
    ...recepcion,
    proveedores: proveedor,
    compra_items: (items || []).map((it) => ({ ...it, productos: productoPorId.get(it.producto_id) })),
  }
}

// Paso 2, exclusivo de dueño: compras ya recibidas y todavía sin costear.
// Acá sí se consulta compras/compra_items directo (con costo), porque solo
// entra dueño a esta pantalla.
export async function listarComprasPendientesCosteo() {
  const { data, error } = await supabase
    .from('compras')
    .select(
      '*, proveedores(nombre), compra_items(id, producto_id, cantidad_maple, unidad_transaccion, cantidad_unidad, productos(nombre))'
    )
    .eq('estado', 'recibida')
    .order('creado_at', { ascending: true })
  if (error) throw error
  return data
}

export async function contarComprasPendientesCosteo() {
  const { count, error } = await supabase
    .from('compras')
    .select('*', { count: 'exact', head: true })
    .eq('estado', 'recibida')
  if (error) throw error
  return count || 0
}

// Carga el costo unitario (por maple) de cada producto recibido. La compra
// pasa a 'costeada' y ahí recién se genera la deuda real con el proveedor.
export async function cargarCostoCompra(compraId, items) {
  const { error } = await supabase.rpc('fn_cargar_costo_compra', {
    p_compra_id: compraId,
    p_items: items,
  })
  if (error) throw error
}
