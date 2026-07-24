export function formatearMoneda(valor) {
  const numero = Number(valor) || 0
  return numero.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

// Para números sin símbolo de $ (ej: cantidades de stock, no montos de dinero)
export function formatearNumero(valor, decimales = 0) {
  const numero = Number(valor) || 0
  return numero.toLocaleString('es-AR', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  })
}
