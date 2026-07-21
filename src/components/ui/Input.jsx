import { forwardRef } from 'react'

const Input = forwardRef(function Input(
  { label, error, tipo = 'text', className = '', numerico = false, ...props },
  ref
) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label && <span className="font-medium text-marca">{label}</span>}
      <input
        ref={ref}
        type={tipo}
        className={`rounded-lg border px-3 py-2 outline-none transition-colors focus:border-marca-claro ${
          numerico ? 'font-mono' : ''
        } ${error ? 'border-perdida' : 'border-marca/20'} ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-perdida">{error}</span>}
    </label>
  )
})

export default Input
