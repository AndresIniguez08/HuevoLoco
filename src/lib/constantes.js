export const ROLES = {
  DUENO: 'dueno',
  ADMINISTRATIVO: 'administrativo',
  DEPOSITO: 'deposito',
  VENDEDOR: 'vendedor',
  CHOFER: 'chofer',
  ENCARGADO_SUCURSAL: 'encargado_sucursal',
  CAJERO_MOSTRADOR: 'cajero_mostrador',
}

export const RUTA_RAIZ_POR_ROL = {
  [ROLES.DUENO]: '/dueno',
  [ROLES.ADMINISTRATIVO]: '/admin',
  [ROLES.DEPOSITO]: '/deposito',
  [ROLES.VENDEDOR]: '/vendedor',
  [ROLES.CHOFER]: '/chofer',
  [ROLES.ENCARGADO_SUCURSAL]: '/sucursal',
  [ROLES.CAJERO_MOSTRADOR]: '/cajero',
}

export const ETIQUETA_ROL = {
  [ROLES.DUENO]: 'Dueño',
  [ROLES.ADMINISTRATIVO]: 'Administrativo',
  [ROLES.DEPOSITO]: 'Depósito',
  [ROLES.VENDEDOR]: 'Vendedor',
  [ROLES.CHOFER]: 'Chofer',
  [ROLES.ENCARGADO_SUCURSAL]: 'Encargado de sucursal',
  [ROLES.CAJERO_MOSTRADOR]: 'Cajero mostrador',
}

export const ROLES_ASIGNABLES = [
  ROLES.DUENO,
  ROLES.ADMINISTRATIVO,
  ROLES.DEPOSITO,
  ROLES.VENDEDOR,
  ROLES.CHOFER,
  ROLES.ENCARGADO_SUCURSAL,
  ROLES.CAJERO_MOSTRADOR,
].map((value) => ({ value, label: ETIQUETA_ROL[value] }))

export const MEDIOS_PAGO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'mercado_pago', label: 'Mercado Pago' },
  { value: 'cuenta_corriente', label: 'Cuenta corriente' },
]

// Denominaciones de billetes para el conteo del arqueo de caja, de mayor a
// menor — define tanto el orden de la tabla en pantalla como en la impresión.
export const DENOMINACIONES_BILLETE = [20000, 10000, 2000, 1000, 500, 200, 100, 50, 20, 10]

export const UNIDADES = {
  MAPLE: 'maple',
  CAJA: 'caja',
  CAJON: 'cajon',
}

// Unidades de venta/stock de productos que NO son huevo (producto.unidad_base
// cuando es_huevo = false) — lista cerrada a propósito: así cualquier valor
// real de unidad_base cae siempre en ETIQUETA_UNIDAD de abajo, sin necesitar
// un fallback para "unidad desconocida" en ningún lugar de la app.
export const UNIDADES_BASE_GENERALES = [
  { value: 'kg', label: 'Kilogramo (kg)' },
  { value: 'litro', label: 'Litro' },
  { value: 'unidad', label: 'Unidad' },
  { value: 'paquete', label: 'Paquete' },
]

export const ETIQUETA_UNIDAD = {
  [UNIDADES.MAPLE]: { singular: 'maple', plural: 'maples' },
  [UNIDADES.CAJA]: { singular: 'caja', plural: 'cajas' },
  [UNIDADES.CAJON]: { singular: 'cajón', plural: 'cajones' },
  kg: { singular: 'kg', plural: 'kg' },
  litro: { singular: 'litro', plural: 'litros' },
  unidad: { singular: 'unidad', plural: 'unidades' },
  paquete: { singular: 'paquete', plural: 'paquetes' },
}

// Arma "3 maples" / "45 kg" / "1 unidad" a partir de una cantidad + unidad
// cruda. Si la unidad no está en ETIQUETA_UNIDAD (no debería pasar, ya que
// unidad_base sale siempre de UNIDADES_BASE_GENERALES o de 'maple'), se
// muestra tal cual en vez de romper.
export function etiquetaCantidadUnidad(cantidad, unidad) {
  const etiqueta = ETIQUETA_UNIDAD[unidad]
  const nombreUnidad = etiqueta ? (Number(cantidad) === 1 ? etiqueta.singular : etiqueta.plural) : unidad
  return `${cantidad} ${nombreUnidad}`
}

// compra_items guarda la unidad/cantidad real de la transacción (unidad_transaccion,
// cantidad_unidad) desde la migración que las agregó. Compras previas a esa
// migración tienen esas columnas en null, así que se cae a cantidad_maple.
export function formatearCantidadItemCompra(item) {
  const cantidadUnidad = item.cantidad_unidad
  const unidadTransaccion = item.unidad_transaccion
  if (cantidadUnidad != null && unidadTransaccion) {
    return etiquetaCantidadUnidad(cantidadUnidad, unidadTransaccion)
  }
  return etiquetaCantidadUnidad(item.cantidad_maple, UNIDADES.MAPLE)
}

// pedidos.estado: pendiente | confirmado | entregado | cancelado
export const ETIQUETA_ESTADO_PEDIDO = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

export const TONO_ESTADO_PEDIDO = {
  pendiente: 'neutro',
  confirmado: 'exito',
  entregado: 'exito',
  cancelado: 'error',
}

// pedidos.estado_pago: pendiente | parcial | pagado
export const ETIQUETA_ESTADO_PAGO = {
  pendiente: 'Sin pagar',
  parcial: 'Pago parcial',
  pagado: 'Pagado',
}

export const TONO_ESTADO_PAGO = {
  pendiente: 'neutro',
  parcial: 'neutro',
  pagado: 'exito',
}

// pedidos.tipo_entrega: reparto | retiro_local
export const TIPOS_ENTREGA = [
  { value: 'reparto', label: 'Reparto' },
  { value: 'retiro_local', label: 'Retira en local' },
]

export const ETIQUETA_TIPO_ENTREGA = Object.fromEntries(TIPOS_ENTREGA.map((t) => [t.value, t.label]))

// remitos_transferencia.estado: enviado | aceptado | con_diferencia
export const ETIQUETA_ESTADO_REMITO = {
  enviado: 'Enviado',
  aceptado: 'Aceptado',
  con_diferencia: 'Con diferencia',
}

export const TONO_ESTADO_REMITO = {
  enviado: 'neutro',
  aceptado: 'exito',
  con_diferencia: 'error',
}

// rendiciones_efectivo.estado: pendiente | confirmada | confirmada_con_diferencia
export const ETIQUETA_ESTADO_RENDICION = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  confirmada_con_diferencia: 'Con diferencia',
}

export const TONO_ESTADO_RENDICION = {
  pendiente: 'neutro',
  confirmada: 'exito',
  confirmada_con_diferencia: 'alerta',
}

export const TIPOS_CLIENTE = [
  { value: 'mayorista', label: 'Mayorista' },
  { value: 'minorista', label: 'Minorista' },
  { value: 'otro', label: 'Otro' },
]

// Las categorías de producto (antes una lista fija acá) ahora viven en la
// tabla categorias_producto, gestionables desde Catálogo > Categorías — ver
// lib/categoriasProducto.js. productos.categoria_huevo_obsoleta quedó sin
// usar, no tocar.
