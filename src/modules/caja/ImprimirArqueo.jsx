import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { obtenerArqueo, formatearDiferencia } from '../../lib/caja'
import { traducirError } from '../../lib/errores'
import { DENOMINACIONES_BILLETE } from '../../lib/constantes'

const BORDE = 'border-[#333]'

function filaResultado(etiqueta, esperado, contado) {
  const { texto } = formatearDiferencia(Number(contado) - Number(esperado))
  return (
    <tr key={etiqueta}>
      <td className={`${BORDE} border p-2.5`}>{etiqueta}</td>
      <td className={`${BORDE} border p-2.5`}>${Number(esperado).toFixed(2)}</td>
      <td className={`${BORDE} border p-2.5`}>${Number(contado).toFixed(2)}</td>
      <td className={`${BORDE} border p-2.5`}>{texto}</td>
    </tr>
  )
}

export default function ImprimirArqueo() {
  const { id } = useParams()
  const [arqueo, setArqueo] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    obtenerArqueo(id)
      .then(setArqueo)
      .catch((e) => setError(traducirError(e)))
      .finally(() => setCargando(false))
  }, [id])

  if (cargando) return <p className="p-6 text-black">Cargando...</p>
  if (error) return <p className="p-6 text-black">{error}</p>

  const detalle = arqueo.detalle_billetes || {}
  const { texto: textoDiferenciaTotal } = formatearDiferencia(
    Number(arqueo.monto_contado) -
      Number(arqueo.monto_esperado) +
      (Number(arqueo.mp_contado) - Number(arqueo.mp_esperado)) +
      (Number(arqueo.transferencia_contado) - Number(arqueo.transferencia_esperado))
  )

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
        Imprimir arqueo
      </button>

      <header className="mb-6">
        <h1 className="font-display text-2xl leading-none">Huevo Loco — Arqueo de caja</h1>
        <div className="mt-4 flex items-end justify-between text-sm">
          <span>
            <strong>Fecha:</strong> {new Date(arqueo.fecha).toLocaleDateString('es-AR')}
          </span>
          <span>
            <strong>Realizado por:</strong> _______________________________
          </span>
        </div>
      </header>

      <p className="mb-2 text-sm font-medium">Conteo de billetes</p>
      <table className={`mb-6 w-full border-collapse text-left text-sm ${BORDE}`}>
        <thead>
          <tr>
            <th className={`${BORDE} border p-2.5`}>Denominación</th>
            <th className={`${BORDE} border p-2.5`}>Cantidad</th>
            <th className={`${BORDE} border p-2.5`}>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {DENOMINACIONES_BILLETE.filter((denom) => detalle[denom]).map((denom) => (
            <tr key={denom}>
              <td className={`${BORDE} border p-2.5`}>${denom}</td>
              <td className={`${BORDE} border p-2.5`}>{detalle[denom]}</td>
              <td className={`${BORDE} border p-2.5`}>${(denom * detalle[denom]).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mb-2 text-sm font-medium">Resultado</p>
      <table className={`w-full border-collapse text-left text-sm ${BORDE}`}>
        <thead>
          <tr>
            <th className={`${BORDE} border p-2.5`}>Medio</th>
            <th className={`${BORDE} border p-2.5`}>Esperado</th>
            <th className={`${BORDE} border p-2.5`}>Contado</th>
            <th className={`${BORDE} border p-2.5`}>Diferencia</th>
          </tr>
        </thead>
        <tbody>
          {filaResultado('Efectivo', arqueo.monto_esperado, arqueo.monto_contado)}
          {filaResultado('Mercado Pago', arqueo.mp_esperado, arqueo.mp_contado)}
          {filaResultado('Transferencia', arqueo.transferencia_esperado, arqueo.transferencia_contado)}
        </tbody>
      </table>

      <p className="mt-4 text-right font-mono text-lg font-medium">Diferencia total: {textoDiferenciaTotal}</p>

      <div className="mt-10 text-sm">
        <span>Firma: _______________________________</span>
      </div>
    </div>
  )
}
