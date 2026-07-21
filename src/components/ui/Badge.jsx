const TONOS = {
  neutro: 'bg-marca/10 text-marca',
  exito: 'bg-fresco/10 text-fresco',
  alerta: 'bg-yema/15 text-yema',
  error: 'bg-perdida/10 text-perdida',
}

export default function Badge({ children, tono = 'neutro', className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONOS[tono]} ${className}`}
    >
      {children}
    </span>
  )
}
