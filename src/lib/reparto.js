import { supabase } from './supabase'
import { obtenerNombresProductos } from './productos'

// Para agrupar, en AsignarReparto, las entregas ya asignadas hoy por
// chofer + camioneta y ofrecer "Imprimir hoja de ruta" por cada combinación.
export async function listarAsignacionesDelDia() {
  const hoy = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('reparto_asignaciones')
    .select('id, chofer_id, camioneta_id, estado, chofer:perfiles(nombre), camioneta:camionetas(nombre, patente)')
    .gte('creado_at', `${hoy}T00:00:00`)
    .order('creado_at')
  if (error) throw error
  return data
}

// Accesible por depósito (no solo dueño) — ver comentario en
// obtenerNombresProductos sobre por qué no se embebe productos(nombre) acá.
export async function obtenerHojaRuta(choferId, camionetaId, fecha) {
  const { data, error } = await supabase
    .from('reparto_asignaciones')
    .select(
      '*, pedidos(id, total, estado_pago, clientes(nombre, direccion, telefono), pedido_items(id, producto_id, cantidad_unidad, unidad_vendida))'
    )
    .eq('chofer_id', choferId)
    .eq('camioneta_id', camionetaId)
    .gte('creado_at', `${fecha}T00:00:00`)
    .lte('creado_at', `${fecha}T23:59:59`)
    .order('creado_at')
  if (error) throw error

  const idsProducto = (data || []).flatMap((a) => (a.pedidos?.pedido_items || []).map((it) => it.producto_id))
  const nombresPorId = await obtenerNombresProductos(idsProducto)

  return (data || []).map((a) => ({
    ...a,
    pedidos: a.pedidos
      ? {
          ...a.pedidos,
          pedido_items: (a.pedidos.pedido_items || []).map((it) => ({
            ...it,
            productos: nombresPorId.get(it.producto_id),
          })),
        }
      : a.pedidos,
  }))
}
