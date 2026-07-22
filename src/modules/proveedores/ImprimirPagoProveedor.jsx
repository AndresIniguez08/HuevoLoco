import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { obtenerComprobantePagoProveedor } from '../../lib/proveedores'
import { traducirError } from '../../lib/errores'
import { MEDIOS_PAGO } from '../../lib/constantes'

const ETIQUETA_MEDIO = Object.fromEntries(MEDIOS_PAGO.map((m) => [m.value, m.label]))

export default function ImprimirPagoProveedor() {
  const { id } = useParams()
  const [pago, setPago] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    obtenerComprobantePagoProveedor(id)
      .then(setPago)
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
        <h1 className="font-display text-2xl leading-none">Huevo Loco — Comprobante de pago a proveedor</h1>
        <p className="mt-1 text-xs text-black/60">Folio {pago.id.slice(0, 8)}</p>
      </header>

      <div className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between border-b border-[#333] py-2">
          <span>Fecha</span>
          <span>{new Date(pago.creado_at).toLocaleDateString('es-AR')}</span>
        </div>
        <div className="flex justify-between border-b border-[#333] py-2">
          <span>Proveedor</span>
          <span>{pago.proveedores?.nombre || '—'}</span>
        </div>
        <div className="flex justify-between border-b border-[#333] py-2">
          <span>Medio de pago</span>
          <span>{ETIQUETA_MEDIO[pago.medio] || pago.medio}</span>
        </div>
        <div className="flex justify-between border-b border-[#333] py-2 font-medium">
          <span>Monto</span>
          <span>${Number(pago.monto).toFixed(2)}</span>
        </div>
      </div>

      <div className="mt-10 text-sm">
        <span>Recibí conforme (proveedor): _______________________________</span>
      </div>
    </div>
  )
}
