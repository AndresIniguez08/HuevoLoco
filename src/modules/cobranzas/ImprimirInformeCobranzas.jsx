import { useEffect, useState } from 'react'
import { listarSaldosClientes, obtenerTotalCobradoUltimos30Dias, listarExcepcionesCCDelMes } from '../../lib/cobranzas'
import { traducirError } from '../../lib/errores'

const BORDE = 'border-[#333]'

export default function ImprimirInformeCobranzas() {
  const [top5, setTop5] = useState([])
  const [totalCobrado, setTotalCobrado] = useState(0)
  const [excepciones, setExcepciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([listarSaldosClientes(), obtenerTotalCobradoUltimos30Dias(), listarExcepcionesCCDelMes()])
      .then(([saldos, cobrado, excs]) => {
        setTop5(saldos.slice(0, 5))
        setTotalCobrado(cobrado)
        setExcepciones(excs)
      })
      .catch((e) => setError(traducirError(e)))
      .finally(() => setCargando(false))
  }, [])

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
        Imprimir informe
      </button>

      <header className="mb-6">
        <h1 className="font-display text-2xl leading-none">Huevo Loco — Informe de cobranzas</h1>
        <p className="mt-1 text-sm text-black/70">{new Date().toLocaleDateString('es-AR')}</p>
      </header>

      <p className="mb-2 text-sm font-medium">Top 5 clientes con mayor deuda</p>
      <table className={`mb-6 w-full border-collapse text-left text-sm ${BORDE}`}>
        <thead>
          <tr>
            <th className={`${BORDE} border p-2.5`}>Cliente</th>
            <th className={`${BORDE} border p-2.5`}>Saldo</th>
          </tr>
        </thead>
        <tbody>
          {top5.length === 0 ? (
            <tr>
              <td className={`${BORDE} border p-2.5`} colSpan={2}>
                Ningún cliente tiene saldo pendiente.
              </td>
            </tr>
          ) : (
            top5.map((c) => (
              <tr key={c.cliente_id}>
                <td className={`${BORDE} border p-2.5`}>{c.nombre}</td>
                <td className={`${BORDE} border p-2.5`}>${Number(c.saldo).toFixed(2)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <p className="mb-6 text-sm font-medium">
        Total cobrado (últimos 30 días): <span className="font-mono">${totalCobrado.toFixed(2)}</span>
      </p>

      <p className="mb-2 text-sm font-medium">Excepciones de cuenta corriente del mes</p>
      <table className={`w-full border-collapse text-left text-sm ${BORDE}`}>
        <thead>
          <tr>
            <th className={`${BORDE} border p-2.5`}>Fecha</th>
            <th className={`${BORDE} border p-2.5`}>Monto</th>
            <th className={`${BORDE} border p-2.5`}>Motivo</th>
            <th className={`${BORDE} border p-2.5`}>Autorizado por</th>
          </tr>
        </thead>
        <tbody>
          {excepciones.length === 0 ? (
            <tr>
              <td className={`${BORDE} border p-2.5`} colSpan={4}>
                No se cargó ninguna excepción este mes.
              </td>
            </tr>
          ) : (
            excepciones.map((e) => (
              <tr key={e.id}>
                <td className={`${BORDE} border p-2.5`}>{new Date(e.creado_at).toLocaleDateString('es-AR')}</td>
                <td className={`${BORDE} border p-2.5`}>${Number(e.monto_excepcion).toFixed(2)}</td>
                <td className={`${BORDE} border p-2.5`}>{e.motivo}</td>
                <td className={`${BORDE} border p-2.5`}>{e.perfiles?.nombre || '—'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
