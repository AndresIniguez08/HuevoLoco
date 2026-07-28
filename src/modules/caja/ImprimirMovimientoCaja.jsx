import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { obtenerMovimientoCaja } from '../../lib/caja'
import { traducirError } from '../../lib/errores'
import { formatearMoneda, formatearFechaHora } from '../../lib/formato'
import { MEDIOS_PAGO } from '../../lib/constantes'

const ETIQUETA_MEDIO = Object.fromEntries(MEDIOS_PAGO.map((m) => [m.value, m.label]))

export default function ImprimirMovimientoCaja() {
  const { id } = useParams()
  const [movimiento, setMovimiento] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    obtenerMovimientoCaja(id)
      .then(setMovimiento)
      .catch((e) => setError(traducirError(e)))
      .finally(() => setCargando(false))
  }, [id])

  if (cargando) return <p className="p-6 text-black">Cargando...</p>
  if (error) return <p className="p-6 text-black">{error}</p>

  const esIngreso = movimiento.tipo === 'ingreso'

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
        Imprimir
      </button>

      <header className="mb-6">
        <h1 className="font-display text-2xl leading-none">Huevo Loco — Comprobante de movimiento de caja</h1>
        <p className="mt-1 text-sm text-black/70">{formatearFechaHora(movimiento.creado_at)}</p>
      </header>

      <div className="mb-6 border border-[#333] p-4 text-center">
        <p className="text-sm">{esIngreso ? 'Ingreso' : 'Egreso'}</p>
        <p className="font-display text-3xl leading-none">{formatearMoneda(movimiento.monto)}</p>
      </div>

      <div className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between border-b border-[#333] py-2">
          <span>Concepto</span>
          <span>{movimiento.concepto || '—'}</span>
        </div>
        <div className="flex justify-between border-b border-[#333] py-2">
          <span>Medio de pago</span>
          <span>{ETIQUETA_MEDIO[movimiento.medio] || movimiento.medio}</span>
        </div>
        <div className="flex justify-between border-b border-[#333] py-2">
          <span>Sucursal</span>
          <span>{movimiento.sucursal_nombre || '—'}</span>
        </div>
        <div className="flex justify-between border-b border-[#333] py-2">
          <span>Registrado por</span>
          <span>{movimiento.usuario_nombre || '—'}</span>
        </div>
      </div>

      <div className="mt-10 text-sm">
        <span>Registrado por: _______________________________</span>
      </div>
    </div>
  )
}
