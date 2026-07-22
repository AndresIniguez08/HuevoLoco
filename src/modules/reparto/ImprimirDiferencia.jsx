import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { obtenerDiferenciaCobro } from '../../lib/diferenciasCobro'
import { formatearDiferencia } from '../../lib/caja'
import { traducirError } from '../../lib/errores'

export default function ImprimirDiferencia() {
  const { id } = useParams()
  const [dif, setDif] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    obtenerDiferenciaCobro(id)
      .then(setDif)
      .catch((e) => setError(traducirError(e)))
      .finally(() => setCargando(false))
  }, [id])

  if (cargando) return <p className="p-6 text-black">Cargando...</p>
  if (error) return <p className="p-6 text-black">{error}</p>

  const esperado = Number(dif.monto_esperado)
  const cobrado = Number(dif.monto_cobrado)
  const { texto: textoDiferencia } = formatearDiferencia(cobrado - esperado)

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
        <h1 className="font-display text-2xl leading-none">Huevo Loco — Diferencia de cobro</h1>
        <p className="mt-1 text-sm text-black/70">{new Date(dif.creado_at).toLocaleDateString('es-AR')}</p>
      </header>

      <div className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between border-b border-[#333] py-2">
          <span>Cliente</span>
          <span>{dif.pedidos?.clientes?.nombre || '—'}</span>
        </div>
        <div className="flex justify-between border-b border-[#333] py-2">
          <span>Chofer</span>
          <span>{dif.chofer?.nombre || '—'}</span>
        </div>
        <div className="flex justify-between border-b border-[#333] py-2">
          <span>Monto esperado</span>
          <span>${esperado.toFixed(2)}</span>
        </div>
        <div className="flex justify-between border-b border-[#333] py-2">
          <span>Monto cobrado</span>
          <span>${cobrado.toFixed(2)}</span>
        </div>
        <div className="flex justify-between border-b border-[#333] py-2 font-medium">
          <span>Diferencia</span>
          <span>{textoDiferencia}</span>
        </div>
        <div className="flex justify-between border-b border-[#333] py-2">
          <span>Motivo</span>
          <span>{dif.motivo || '—'}</span>
        </div>
        <div className="flex justify-between border-b border-[#333] py-2">
          <span>Revisado</span>
          <span>{dif.revisado ? `Sí — ${dif.revisor?.nombre || '—'}` : 'No'}</span>
        </div>
      </div>

      <div className="mt-10 text-sm">
        <span>Revisado por: _______________________________</span>
      </div>
    </div>
  )
}
