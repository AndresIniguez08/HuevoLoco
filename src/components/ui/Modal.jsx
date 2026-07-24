import { X } from 'lucide-react'

export default function Modal({ abierto, onCerrar, titulo, children, ancho = 'max-w-md' }) {
  if (!abierto) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-marca/40 p-4">
      <div className={`flex max-h-[90dvh] w-full ${ancho} flex-col rounded-xl bg-white shadow-xl`}>
        <div className="flex items-center justify-between p-5 pb-4">
          <h2 className="font-display text-lg text-marca">{titulo}</h2>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="rounded-full p-1 text-marca/60 hover:bg-marca/5 hover:text-marca"
          >
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto px-5 pb-5">{children}</div>
      </div>
    </div>
  )
}
