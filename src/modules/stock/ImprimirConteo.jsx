import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { obtenerConteo, listarItemsConteo } from '../../lib/conteoStock'
import { traducirError } from '../../lib/errores'

const BORDE = 'border-[#333]'

export default function ImprimirConteo() {
  const { id } = useParams()
  const [conteo, setConteo] = useState(null)
  const [items, setItems] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([obtenerConteo(id), listarItemsConteo(id)])
      .then(([datosConteo, datosItems]) => {
        setConteo(datosConteo)
        setItems(datosItems)
      })
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
        Imprimir hoja de conteo
      </button>

      <header className="mb-6">
        <h1 className="font-display text-3xl leading-none">Huevo Loco</h1>
        <p className="mt-1 text-sm text-black/70">Hoja de conteo físico de stock</p>
        <div className="mt-4 flex items-end justify-between text-sm">
          <span>
            <strong>Fecha del conteo:</strong> {conteo && new Date(conteo.fecha).toLocaleDateString('es-AR')}
          </span>
          <span>
            <strong>Realizado por:</strong> _______________________________
          </span>
        </div>
      </header>

      <table className={`w-full border-collapse text-left text-sm ${BORDE}`}>
        <colgroup>
          <col className="w-[22%]" />
          <col className="w-[11%]" />
          <col className="w-[11%]" />
          <col className="w-[12%]" />
          <col className="w-[11%]" />
          <col className="w-[11%]" />
          <col className="w-[12%]" />
          <col className="w-[10%]" />
        </colgroup>
        <thead>
          <tr>
            <th className={`${BORDE} border p-2.5`}>Producto</th>
            <th className={`${BORDE} border p-2.5`}>Cajones esperados</th>
            <th className={`${BORDE} border p-2.5`}>Cajas esperadas</th>
            <th className={`${BORDE} border p-2.5`}>Maples sueltos esperados</th>
            <th className={`${BORDE} border p-2.5`}>Cajones contados</th>
            <th className={`${BORDE} border p-2.5`}>Cajas contadas</th>
            <th className={`${BORDE} border p-2.5`}>Maples sueltos contados</th>
            <th className={`${BORDE} border p-2.5`}>Diferencia</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.producto_id}>
              <td className={`${BORDE} border p-2.5`}>{it.producto?.nombre || 'Producto'}</td>
              <td className={`${BORDE} border p-2.5`}>{it.cajones_esperado}</td>
              <td className={`${BORDE} border p-2.5`}>{it.cajas_esperado}</td>
              <td className={`${BORDE} border p-2.5`}>{it.maples_sueltos_esperado}</td>
              <td className={`${BORDE} border p-2.5`}>&nbsp;</td>
              <td className={`${BORDE} border p-2.5`}>&nbsp;</td>
              <td className={`${BORDE} border p-2.5`}>&nbsp;</td>
              <td className={`${BORDE} border p-2.5`}>&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-10 flex justify-between text-sm">
        <span>Firma depósito: _______________________________</span>
        <span>Firma control: _______________________________</span>
      </div>
    </div>
  )
}
