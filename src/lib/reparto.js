import { supabase } from './supabase'

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

export async function obtenerHojaRuta(choferId, camionetaId, fecha) {
  const { data, error } = await supabase
    .from('reparto_asignaciones')
    .select(
      '*, pedidos(id, total, estado_pago, clientes(nombre, direccion, telefono), pedido_items(id, cantidad_unidad, unidad_vendida, productos(nombre)))'
    )
    .eq('chofer_id', choferId)
    .eq('camioneta_id', camionetaId)
    .gte('creado_at', `${fecha}T00:00:00`)
    .lte('creado_at', `${fecha}T23:59:59`)
    .order('creado_at')
  if (error) throw error
  return data
}
