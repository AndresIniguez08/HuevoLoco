import { supabase } from './supabase'

// Compras/Administrativo crea la orden (sin tocar stock ni costo promedio);
// Depósito la confirma después con fn_recibir_compra al recibir la mercadería.
export async function crearCompra(proveedorId, items) {
  const { data, error } = await supabase.rpc('fn_crear_compra', {
    p_proveedor_id: proveedorId,
    p_items: items,
  })
  if (error) throw error
  return data
}

export async function obtenerCompraParaImprimir(compraId) {
  const { data, error } = await supabase
    .from('compras')
    .select(
      '*, proveedores(nombre), compra_items(id, cantidad_maple, unidad_transaccion, cantidad_unidad, costo_unitario, productos(nombre))'
    )
    .eq('id', compraId)
    .single()
  if (error) throw error
  return data
}

// Cola de recepción de depósito: solo lo que todavía no confirmaron. Sin
// costo_unitario — depósito confirma cantidades, no precios.
export async function listarComprasPendientes() {
  const { data, error } = await supabase
    .from('compras')
    .select(
      '*, proveedores(nombre), compra_items(id, cantidad_maple, unidad_transaccion, cantidad_unidad, productos(nombre))'
    )
    .eq('estado', 'pendiente')
    .order('creado_at', { ascending: true })
  if (error) throw error
  return data
}

export async function recibirCompra(compraId) {
  const { error } = await supabase.rpc('fn_recibir_compra', { p_compra_id: compraId })
  if (error) throw error
}

export async function reportarDiferenciaCompra(compraId, observacion) {
  const { error } = await supabase.rpc('fn_reportar_diferencia_compra', {
    p_compra_id: compraId,
    p_observacion: observacion,
  })
  if (error) throw error
}

export async function contarComprasDiferenciaSinRevisar() {
  const { count, error } = await supabase
    .from('compras')
    .select('*', { count: 'exact', head: true })
    .eq('estado', 'con_diferencia')
    .eq('revisado', false)
  if (error) throw error
  return count || 0
}

// compras tiene tres FKs hacia perfiles (usuario_id, recibido_por,
// revisado_por) — sin el hint !fk_constraint, PostgREST no puede resolver
// el embed y tira PGRST201 (mismo caso que remitos_transferencia).
export async function listarComprasDiferencia() {
  const { data, error } = await supabase
    .from('compras')
    .select(
      `
      *,
      proveedores(nombre),
      receptor:perfiles!compras_recibido_por_fkey (nombre),
      revisor:perfiles!compras_revisado_por_fkey (nombre)
    `
    )
    .eq('estado', 'con_diferencia')
    .order('revisado', { ascending: true })
    .order('creado_at', { ascending: false })
  if (error) throw error
  return data
}

export async function revisarCompra(compraId) {
  const { error } = await supabase.rpc('fn_revisar_compra', { p_compra_id: compraId })
  if (error) throw error
}
