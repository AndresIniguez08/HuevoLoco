import { X } from 'lucide-react'

export default function Modal({ abierto, onCerrar, titulo, children }) {
  if (!abierto) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-marca/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg text-marca">{titulo}</h2>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="rounded-full p-1 text-marca/60 hover:bg-marca/5 hover:text-marca"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
