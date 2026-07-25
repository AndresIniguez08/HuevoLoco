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

export function formatearFechaHora(valor) {
  if (!valor) return '—'
  const fecha = new Date(valor)
  return fecha.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
}

// Para donde solo se necesita fecha, sin hora
export function formatearFecha(valor) {
  if (!valor) return '—'
  const fecha = new Date(valor)
  return fecha.toLocaleDateString('es-AR')
}
