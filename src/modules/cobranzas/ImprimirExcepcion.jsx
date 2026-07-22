import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { obtenerExcepcionCC } from '../../lib/cobranzas'
import { traducirError } from '../../lib/errores'

export default function ImprimirExcepcion() {
  const { id } = useParams()
  const [excepcion, setExcepcion] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    obtenerExcepcionCC(id)
      .then(setExcepcion)
      .catch((e) => setError(traducirError(e)))
      .finally(() => setCargando(false))
  }, [id])

  if (cargando) return <p className="p-6 text-black">Cargando...</p>
  if (error) return <p className="p-6 text-black">{error}</p>

  return (
    <div className="min-h-screen bg-white p-6 text-black">
      {/* @page cubre el margen de impresión, pero el navegador agrega su propio
          encabezado/pie (URL, fecha) que ningún CSS puede suprimir — hay que
          avisarle al usuario que lo desactive en el diálogo de impresión
          ("Más ajustes" > desmarcar "Encabezados y pies de página"). */}
      <style>{`
        @media print {
          @page { margin: 15mm; }
        }
      `}</style>

      <button
        onClick={() => window.print()}
        className="print:hidden mb-6 rounded-lg border border-black px-4 py-2 text-sm font-medium"
      >
        Imprimir autorización
      </button>

      <header className="mb-6">
        <h1 className="font-display text-2xl leading-none">Huevo Loco — Excepción de cuenta corriente</h1>
        <p className="mt-1 text-sm text-black/70">{new Date(excepcion.creado_at).toLocaleDateString('es-AR')}</p>
      </header>

      <div className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between border-b border-[#333] py-2">
          <span>Cliente</span>
          <span>{excepcion.pedidos?.clientes?.nombre || '—'}</span>
        </div>
        <div className="flex justify-between border-b border-[#333] py-2">
          <span>Pedido asociado</span>
          <span>
            {excepcion.pedidos ? `${excepcion.pedidos.id.slice(0, 8)} — ${new Date(excepcion.pedidos.creado_at).toLocaleDateString('es-AR')}` : '—'}
          </span>
        </div>
        <div className="flex justify-between border-b border-[#333] py-2">
          <span>Monto de la excepción</span>
          <span>${Number(excepcion.monto_excepcion).toFixed(2)}</span>
        </div>
        <div className="flex justify-between border-b border-[#333] py-2">
          <span>Motivo</span>
          <span>{excepcion.motivo}</span>
        </div>
        <div className="flex justify-between border-b border-[#333] py-2">
          <span>Autorizado por</span>
          <span>{excepcion.perfiles?.nombre || '—'}</span>
        </div>
      </div>

      <div className="mt-10 flex justify-between text-sm">
        <span>Autorizado por: _______________________________</span>
        <span>Dueño (si corresponde doble validación): _______________________________</span>
      </div>
    </div>
  )
}
