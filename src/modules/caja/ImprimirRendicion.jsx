import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { obtenerRendicion } from '../../lib/rendicionesEfectivo'
import { formatearDiferencia } from '../../lib/caja'
import { traducirError } from '../../lib/errores'
import { formatearMoneda, formatearFechaHora } from '../../lib/formato'
import { ETIQUETA_ESTADO_RENDICION } from '../../lib/constantes'

export default function ImprimirRendicion() {
  const { id } = useParams()
  const [rendicion, setRendicion] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    obtenerRendicion(id)
      .then(setRendicion)
      .catch((e) => setError(traducirError(e)))
      .finally(() => setCargando(false))
  }, [id])

  if (cargando) return <p className="p-6 text-black">Cargando...</p>
  if (error) return <p className="p-6 text-black">{error}</p>

  const confirmada = rendicion.estado !== 'pendiente'
  const diferencia = confirmada ? formatearDiferencia(Number(rendicion.diferencia) || 0) : null

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
        <h1 className="font-display text-2xl leading-none">Huevo Loco — Comprobante de rendición de efectivo</h1>
        <p className="mt-1 text-sm text-black/70">{formatearFechaHora(rendicion.fecha_envio)}</p>
      </header>

      <div className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between border-b border-[#333] py-2">
          <span>Sucursal</span>
          <span>{rendicion.sucursales?.nombre || '—'}</span>
        </div>
        <div className="flex justify-between border-b border-[#333] py-2">
          <span>Monto declarado</span>
          <span>{formatearMoneda(rendicion.monto_declarado)}</span>
        </div>
        <div className="flex justify-between border-b border-[#333] py-2">
          <span>Generado por</span>
          <span>{rendicion.creador?.nombre || '—'}</span>
        </div>
        <div className="flex justify-between border-b border-[#333] py-2">
          <span>Estado</span>
          <span>{ETIQUETA_ESTADO_RENDICION[rendicion.estado] || rendicion.estado}</span>
        </div>
        {rendicion.observaciones && (
          <div className="flex justify-between border-b border-[#333] py-2">
            <span>Observaciones</span>
            <span>{rendicion.observaciones}</span>
          </div>
        )}

        {confirmada && (
          <>
            <div className="flex justify-between border-b border-[#333] py-2">
              <span>Monto recibido</span>
              <span>{formatearMoneda(rendicion.monto_recibido)}</span>
            </div>
            <div className="flex justify-between border-b border-[#333] py-2 font-medium">
              <span>Diferencia</span>
              <span>{diferencia.texto}</span>
            </div>
            <div className="flex justify-between border-b border-[#333] py-2">
              <span>Confirmado por</span>
              <span>{rendicion.confirmador?.nombre || '—'}</span>
            </div>
            <div className="flex justify-between border-b border-[#333] py-2">
              <span>Fecha de confirmación</span>
              <span>{formatearFechaHora(rendicion.fecha_confirmacion)}</span>
            </div>
            {rendicion.observaciones_confirmacion && (
              <div className="flex justify-between border-b border-[#333] py-2">
                <span>Observaciones de confirmación</span>
                <span>{rendicion.observaciones_confirmacion}</span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-10 text-sm">
        <span>Recibido por: _______________________________</span>
      </div>
    </div>
  )
}
