import { UNIDADES } from './constantes'

// Única fuente de conversión entre maple / caja / cajón. Ningún otro
// componente debe hardcodear las equivalencias del producto.
export function convertirAMaple(cantidad, unidad, producto) {
  const cantidadNum = Number(cantidad) || 0
  if (unidad === UNIDADES.CAJA) return cantidadNum * (producto.equivalencia_caja || 0)
  if (unidad === UNIDADES.CAJON) return cantidadNum * (producto.equivalencia_cajon || 0)
  return cantidadNum
}

export function unidadesDisponibles(producto) {
  const disponibles = [UNIDADES.MAPLE]
  if (producto.admite_caja) disponibles.push(UNIDADES.CAJA)
  if (producto.equivalencia_cajon) disponibles.push(UNIDADES.CAJON)
  return disponibles
}
