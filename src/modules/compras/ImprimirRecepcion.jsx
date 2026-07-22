import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { obtenerCompraParaImprimir } from '../../lib/compras'
import { traducirError } from '../../lib/errores'
import { formatearCantidadItemCompra } from '../../lib/constantes'

const BORDE = 'border-[#333]'

export default function ImprimirRecepcion() {
  const { id } = useParams()
  const [compra, setCompra] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    obtenerCompraParaImprimir(id)
      .then(setCompra)
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
        <h1 className="font-display text-2xl leading-none">Huevo Loco — Recepción de compra</h1>
        <p className="mt-1 text-sm text-black/70">{new Date(compra.creado_at).toLocaleDateString('es-AR')}</p>
      </header>

      <p className="mb-6 text-sm">
        <strong>Proveedor:</strong> {compra.proveedores?.nombre || '—'}
      </p>

      <table className={`w-full border-collapse text-left text-sm ${BORDE}`}>
        <thead>
          <tr>
            <th className={`${BORDE} border p-2.5`}>Producto</th>
            <th className={`${BORDE} border p-2.5`}>Cantidad</th>
            <th className={`${BORDE} border p-2.5`}>Costo unitario</th>
            <th className={`${BORDE} border p-2.5`}>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {(compra.compra_items || []).map((item) => (
            <tr key={item.id}>
              <td className={`${BORDE} border p-2.5`}>{item.productos?.nombre || 'Producto'}</td>
              <td className={`${BORDE} border p-2.5`}>{formatearCantidadItemCompra(item)}</td>
              <td className={`${BORDE} border p-2.5`}>${Number(item.costo_unitario).toFixed(2)}</td>
              <td className={`${BORDE} border p-2.5`}>
                ${(Number(item.costo_unitario) * Number(item.cantidad_maple)).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-4 text-right font-mono text-lg font-medium">Total: ${Number(compra.total).toFixed(2)}</p>

      <div className="mt-10 flex justify-between text-sm">
        <span>Recibido por: _______________________________</span>
        <span>Entregado por (proveedor): _______________________________</span>
      </div>
    </div>
  )
}
