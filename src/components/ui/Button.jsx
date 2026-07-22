const VARIANTES = {
  primario: 'bg-marca text-white hover:bg-marca/90 disabled:bg-marca/40',
  secundario: 'bg-white text-marca border border-marca/30 hover:bg-marca/5 disabled:text-marca/30',
  peligro: 'bg-perdida text-white hover:bg-perdida/90 disabled:bg-perdida/40',
  confirmar: 'bg-fresco text-white hover:bg-fresco/90 disabled:bg-fresco/40',
  fantasma: 'text-marca hover:bg-marca/5 disabled:text-marca/30',
  // Para botones de acción positiva apoyados sobre una tarjeta bg-marca (ej.
  // saldo adeudado): "secundario" se funde con ese fondo en hover porque su
  // tono es el mismo navy. Este variant pasa a un acento sólido en hover.
  claro: 'bg-white text-marca hover:bg-fresco hover:text-white disabled:text-marca/30',
}

const TAMANOS = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-4 text-base',
}

export default function Button({
  children,
  variante = 'primario',
  tamano = 'md',
  className = '',
  disabled = false,
  cargando = false,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || cargando}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed ${VARIANTES[variante]} ${TAMANOS[tamano]} ${className}`}
      {...props}
    >
      {cargando ? 'Procesando...' : children}
    </button>
  )
}
