export function inicioDeHoy() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export function inicioDeSemana() {
  const d = new Date()
  const dia = d.getDay()
  const diff = dia === 0 ? 6 : dia - 1 // semana arranca el lunes
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function inicioDeMes() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

// Mismos 4 filtros rápidos de período en todas las pantallas que los usan
// (Resumen por sucursal, Reporte de deuda): "hasta" siempre es el momento
// actual, "General" manda desde/hasta null (sin filtrar).
export const PERIODOS = [
  { id: 'hoy', label: 'Hoy', rango: () => ({ desde: inicioDeHoy(), hasta: new Date() }) },
  { id: 'semana', label: 'Esta semana', rango: () => ({ desde: inicioDeSemana(), hasta: new Date() }) },
  { id: 'mes', label: 'Este mes', rango: () => ({ desde: inicioDeMes(), hasta: new Date() }) },
  { id: 'general', label: 'General', rango: () => ({ desde: null, hasta: null }) },
]
