import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { obtenerPerdida } from '../../lib/perdidas'
import { traducirError } from '../../lib/errores'

export default function ImprimirPerdida() {
  const { id } = useParams()
  const [perdida, setPerdida] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    obtenerPerdida(id)
      .then(setPerdida)
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
        Imprimir comprobante
      </button>

      <header className="mb-6">
        <h1 className="font-display text-2xl leading-none">Huevo Loco — Comprobante de pérdida</h1>
        <p className="mt-1 text-sm text-black/70">{new Date(perdida.creado_at).toLocaleDateString('es-AR')}</p>
      </header>

      <div className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between border-b border-[#333] py-2">
          <span>Producto</span>
          <span>{perdida.productos?.nombre || '—'}</span>
        </div>
        <div className="flex justify-between border-b border-[#333] py-2">
          <span>Cantidad</span>
          <span>
            {perdida.cantidad_unidad_transaccion} {perdida.unidad_transaccion}
          </span>
        </div>
        <div className="flex justify-between border-b border-[#333] py-2">
          <span>Motivo</span>
          <span>{perdida.motivo}</span>
        </div>
        <div className="flex justify-between border-b border-[#333] py-2">
          <span>Registrado por</span>
          <span>{perdida.perfiles?.nombre || '—'}</span>
        </div>
      </div>

      <div className="mt-10 text-sm">
        <span>Registrado por: _______________________________</span>
      </div>
    </div>
  )
}
