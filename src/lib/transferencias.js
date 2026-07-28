import { supabase } from './supabase'
import { obtenerNombresProductos } from './productos'

export async function listarSucursales() {
  const { data, error } = await supabase.from('sucursales').select('*').order('nombre')
  if (error) throw error
  return data
}

// fn_resumen_sucursales ya bloquea esto a dueño/administrativo en el
// backend — el frontend solo evita mostrar el botón a otros roles, no es la
// única barrera. p_desde/p_hasta son opcionales (null = histórico completo)
// y solo filtran facturación_total/cantidad_ventas — deuda_total y
// valor_stock siempre son la foto actual, a propósito.
export async function obtenerResumenSucursales(desde = null, hasta = null) {
  const { data, error } = await supabase.rpc('fn_resumen_sucursales', { p_desde: desde, p_hasta: hasta })
  if (error) throw error
  return data || []
}

// fn_crear_venta_sucursal se salta la validación de stock disponible cuando
// esto está en true (ej: venta con seña que el cliente retira más tarde).
export async function actualizarPermiteVentaSinStock(sucursalId, permite) {
  const { error } = await supabase
    .from('sucursales')
    .update({ permite_venta_sin_stock: permite })
    .eq('id', sucursalId)
  if (error) throw error
}

// fn_confirmar_pedido considera autorizado a un cliente si tiene su propia
// autorización de CC o si su sucursal tiene este toggle general prendido —
// no hace falta autorizar cliente por cliente.
export async function configurarCCSucursal(sucursalId, habilitada, limiteDefault) {
  const { error } = await supabase.rpc('fn_configurar_cc_sucursal', {
    p_sucursal_id: sucursalId,
    p_habilitada: habilitada,
    p_limite_default: limiteDefault,
  })
  if (error) throw error
}

export async function crearRemitoTransferencia(sucursalDestinoId, items) {
  const { data, error } = await supabase.rpc('fn_crear_remito_transferencia', {
    p_sucursal_destino_id: sucursalDestinoId,
    p_items: items,
  })
  if (error) throw error
  return data
}

// remitos_transferencia tiene tres FKs hacia perfiles (usuario_id,
// aceptado_por, revisado_por) y dos hacia sucursales (sucursal_origen_id,
// sucursal_destino_id) — sin el hint !fk_constraint, PostgREST no puede
// resolver el embed y tira PGRST201.
const SELECT_REMITO = `
  *,
  sucursales!remitos_transferencia_sucursal_destino_id_fkey (nombre),
  creador:perfiles!remitos_transferencia_usuario_id_fkey (nombre),
  receptor:perfiles!remitos_transferencia_aceptado_por_fkey (nombre),
  revisor:perfiles!remitos_transferencia_revisado_por_fkey (nombre)
`

export async function listarRemitosTransferencia() {
  const { data, error } = await supabase
    .from('remitos_transferencia')
    .select(SELECT_REMITO)
    .order('creado_at', { ascending: false })
  if (error) throw error
  return data
}

// Accesible por dueño/administrativo y por la sucursal receptora (no solo
// dueño) — ver comentario en obtenerNombresProductos sobre por qué no se
// embebe productos(nombre) acá.
export async function obtenerRemitoTransferencia(id) {
  const { data, error } = await supabase
    .from('remitos_transferencia')
    .select(
      `${SELECT_REMITO}, remito_transferencia_items(id, producto_id, cantidad_maple, unidad_transaccion, cantidad_unidad)`
    )
    .eq('id', id)
    .single()
  if (error) throw error

  const nombresPorId = await obtenerNombresProductos((data.remito_transferencia_items || []).map((it) => it.producto_id))
  return {
    ...data,
    remito_transferencia_items: (data.remito_transferencia_items || []).map((it) => ({
      ...it,
      productos: nombresPorId.get(it.producto_id),
    })),
  }
}

// Cola de recepción de la sucursal: solo lo que todavía está en tránsito.
// Una vez aceptado o reportado con diferencia, sale de acá.
export async function listarRemitosPendientesSucursal(sucursalId) {
  const { data, error } = await supabase
    .from('remitos_transferencia')
    .select('*, remito_transferencia_items(id, producto_id, cantidad_maple, unidad_transaccion, cantidad_unidad)')
    .eq('sucursal_destino_id', sucursalId)
    .eq('estado', 'enviado')
    .order('creado_at', { ascending: true })
  if (error) throw error

  const idsProducto = (data || []).flatMap((r) => (r.remito_transferencia_items || []).map((it) => it.producto_id))
  const nombresPorId = await obtenerNombresProductos(idsProducto)

  return (data || []).map((r) => ({
    ...r,
    remito_transferencia_items: (r.remito_transferencia_items || []).map((it) => ({
      ...it,
      productos: nombresPorId.get(it.producto_id),
    })),
  }))
}

export async function aceptarRemito(remitoId) {
  const { error } = await supabase.rpc('fn_aceptar_remito', { p_remito_id: remitoId })
  if (error) throw error
}

export async function reportarDiferenciaRemito(remitoId, observacion) {
  const { error } = await supabase.rpc('fn_reportar_diferencia_remito', {
    p_remito_id: remitoId,
    p_observacion: observacion,
  })
  if (error) throw error
}

export async function revisarRemito(remitoId) {
  const { error } = await supabase.rpc('fn_revisar_remito', { p_remito_id: remitoId })
  if (error) throw error
}
