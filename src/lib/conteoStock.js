import { supabase } from './supabase'

// fn_crear_conteo_stock no toma parámetros: usa auth.uid() para usuario_id
// y guarda la foto de lo esperado (cajones/cajas) en conteo_stock_items.
export async function crearConteo() {
  const { data, error } = await supabase.rpc('fn_crear_conteo_stock')
  if (error) throw error
  return data
}

export async function listarConteos() {
  const { data, error } = await supabase
    .from('conteos_stock')
    .select('*, sucursales(nombre)')
    .order('fecha', { ascending: false })
  if (error) throw error
  return data
}

export async function obtenerConteo(id) {
  const { data, error } = await supabase.from('conteos_stock').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function listarItemsConteo(conteoId) {
  const { data, error } = await supabase
    .from('conteo_stock_items')
    .select('*, producto:productos(nombre)')
    .eq('conteo_id', conteoId)
  if (error) throw error
  return (data || []).slice().sort((a, b) => (a.producto?.nombre || '').localeCompare(b.producto?.nombre || ''))
}

// Nombres de parámetros confirmados contra el schema cache de PostgREST
// (el mensaje de error de un intento con nombres sin prefijo "p_" los reveló).
export async function guardarItemConteo(conteoId, productoId, cajonesContado, cajasContado, maplesSueltosContado = 0) {
  const { error } = await supabase.rpc('fn_guardar_conteo_item', {
    p_conteo_id: conteoId,
    p_producto_id: productoId,
    p_cajones_contado: cajonesContado,
    p_cajas_contado: cajasContado,
    p_maples_sueltos_contado: maplesSueltosContado,
  })
  if (error) throw error
}

export async function cerrarConteo(conteoId) {
  const { error } = await supabase.rpc('fn_cerrar_conteo_stock', { p_conteo_id: conteoId })
  if (error) throw error
}

// Historial de conteos ya cerrados para la pantalla de auditorías: quién lo
// hizo y cuántos productos quedaron con diferencia. Se arma con consultas
// separadas (no con un embed de relación no verificado) y se combina acá,
// mismo patrón que obtenerProductosConStock en lib/productos.js.
export async function listarConteosCerrados() {
  const { data: conteos, error } = await supabase
    .from('conteos_stock')
    .select('*')
    .eq('cerrado', true)
    .order('fecha', { ascending: false })
  if (error) throw error
  if (conteos.length === 0) return []

  const idsUsuario = [...new Set(conteos.map((c) => c.usuario_id).filter(Boolean))]
  const idsConteo = conteos.map((c) => c.id)

  const [perfilesRes, itemsRes] = await Promise.all([
    idsUsuario.length > 0
      ? supabase.from('perfiles').select('id, nombre').in('id', idsUsuario)
      : Promise.resolve({ data: [], error: null }),
    supabase.from('conteo_stock_items').select('conteo_id, diferencia_cajones, diferencia_cajas').in('conteo_id', idsConteo),
  ])
  if (perfilesRes.error) throw perfilesRes.error
  if (itemsRes.error) throw itemsRes.error

  const nombrePorUsuario = Object.fromEntries((perfilesRes.data || []).map((p) => [p.id, p.nombre]))
  const diferenciasPorConteo = {}
  for (const it of itemsRes.data || []) {
    const tieneDiferencia = (it.diferencia_cajones ?? 0) !== 0 || (it.diferencia_cajas ?? 0) !== 0
    if (tieneDiferencia) diferenciasPorConteo[it.conteo_id] = (diferenciasPorConteo[it.conteo_id] || 0) + 1
  }

  return conteos.map((c) => ({
    ...c,
    usuario_nombre: nombrePorUsuario[c.usuario_id] || null,
    cantidad_diferencias: diferenciasPorConteo[c.id] || 0,
  }))
}
