export const ROLES = {
  DUENO: 'dueno',
  ADMINISTRATIVO: 'administrativo',
  DEPOSITO: 'deposito',
  VENDEDOR: 'vendedor',
  CHOFER: 'chofer',
  ENCARGADO_SUCURSAL: 'encargado_sucursal',
}

export const RUTA_RAIZ_POR_ROL = {
  [ROLES.DUENO]: '/dueno',
  [ROLES.ADMINISTRATIVO]: '/admin',
  [ROLES.DEPOSITO]: '/deposito',
  [ROLES.VENDEDOR]: '/vendedor',
  [ROLES.CHOFER]: '/chofer',
  [ROLES.ENCARGADO_SUCURSAL]: '/sucursal',
}

export const ETIQUETA_ROL = {
  [ROLES.DUENO]: 'Dueño',
  [ROLES.ADMINISTRATIVO]: 'Administrativo',
  [ROLES.DEPOSITO]: 'Depósito',
  [ROLES.VENDEDOR]: 'Vendedor',
  [ROLES.CHOFER]: 'Chofer',
  [ROLES.ENCARGADO_SUCURSAL]: 'Encargado de sucursal',
}

export const ROLES_ASIGNABLES = [
  ROLES.DUENO,
  ROLES.ADMINISTRATIVO,
  ROLES.DEPOSITO,
  ROLES.VENDEDOR,
  ROLES.CHOFER,
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

export const ETIQUETA_UNIDAD = {
  [UNIDADES.MAPLE]: { singular: 'maple', plural: 'maples' },
  [UNIDADES.CAJA]: { singular: 'caja', plural: 'cajas' },
  [UNIDADES.CAJON]: { singular: 'cajón', plural: 'cajones' },
}

// compra_items guarda la unidad/cantidad real de la transacción (unidad_transaccion,
// cantidad_unidad) desde la migración que las agregó. Compras previas a esa
// migración tienen esas columnas en null, así que se cae a cantidad_maple.
export function formatearCantidadItemCompra(item) {
  const cantidadUnidad = item.cantidad_unidad
  const unidadTransaccion = item.unidad_transaccion
  if (cantidadUnidad != null && unidadTransaccion) {
    const etiqueta = ETIQUETA_UNIDAD[unidadTransaccion]
    const nombreUnidad = etiqueta
      ? Number(cantidadUnidad) === 1
        ? etiqueta.singular
        : etiqueta.plural
      : unidadTransaccion
    return `${cantidadUnidad} ${nombreUnidad}`
  }
  const cantidadMaple = item.cantidad_maple
  return `${cantidadMaple} ${Number(cantidadMaple) === 1 ? 'maple' : 'maples'}`
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

export const TIPOS_CLIENTE = [
  { value: 'mayorista', label: 'Mayorista' },
  { value: 'minorista', label: 'Minorista' },
  { value: 'otro', label: 'Otro' },
]

// productos.categoria_huevo — solo aplica cuando es_huevo = true
export const CATEGORIAS_HUEVO = [
  { value: '4', label: 'Categoría 4' },
  { value: '3', label: 'Categoría 3' },
  { value: '2', label: 'Categoría 2' },
  { value: '1', label: 'Categoría 1' },
  { value: 'jumbo', label: 'Jumbo' },
  { value: 'manchado', label: 'Manchado' },
  { value: 'crack', label: 'Crack' },
]

export const ETIQUETA_CATEGORIA_HUEVO = Object.fromEntries(CATEGORIAS_HUEVO.map((c) => [c.value, c.label]))

// Regla de negocio: solo estas categorías admiten venta por caja
export const CATEGORIAS_HUEVO_ADMITEN_CAJA = ['3', '2', '1']
