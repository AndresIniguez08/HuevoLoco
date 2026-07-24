// Medidas exactas a propósito — no cambiar sin probar visualmente:
// track h-6 w-11 (24x44), thumb h-4 w-4 (16px), translate-x-1 apagado /
// translate-x-6 prendido. Cualquier otro valor de translate deja el thumb
// pegado a un borde o saliéndose de la barra.
export default function Toggle({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
        checked ? 'bg-fresco' : 'bg-gray-300'
      } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}
