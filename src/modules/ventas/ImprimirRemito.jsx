import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { obtenerPedidoParaImprimir } from '../../lib/ventas'
import { obtenerTotalesPagadosPorPedidos } from '../../lib/cobranzas'
import { traducirError } from '../../lib/errores'
import { ETIQUETA_UNIDAD, ETIQUETA_ESTADO_PAGO } from '../../lib/constantes'

const BORDE = 'border-[#333]'

function etiquetaCantidadUnidad(cantidad, unidad) {
  const et = ETIQUETA_UNIDAD[unidad]
  if (!et) return `${cantidad} ${unidad}`
  return `${cantidad} ${Number(cantidad) === 1 ? et.singular : et.plural}`
}

export default function ImprimirRemito() {
  const { id } = useParams()
  const [pedido, setPedido] = useState(null)
  const [pagado, setPagado] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([obtenerPedidoParaImprimir(id), obtenerTotalesPagadosPorPedidos([id])])
      .then(([datosPedido, totales]) => {
        setPedido(datosPedido)
        setPagado(totales.get(id) || 0)
      })
      .catch((e) => setError(traducirError(e)))
      .finally(() => setCargando(false))
  }, [id])

  if (cargando) return <p className="p-6 text-black">Cargando...</p>
  if (error) return <p className="p-6 text-black">{error}</p>

  const pendiente = Number(pedido.total) - pagado

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
        Imprimir remito
      </button>

      <header className="mb-6">
        <h1 className="font-display text-2xl leading-none">Huevo Loco — Remito</h1>
        <p className="mt-1 text-sm text-black/70">{new Date(pedido.creado_at).toLocaleDateString('es-AR')}</p>
      </header>

      <div className="mb-6 flex flex-col gap-1 text-sm">
        <p>
          <strong>Cliente:</strong> {pedido.clientes?.nombre || '—'}
        </p>
        {pedido.clientes?.direccion && (
          <p>
            <strong>Dirección:</strong> {pedido.clientes.direccion}
          </p>
        )}
        {pedido.clientes?.telefono && (
          <p>
            <strong>Teléfono:</strong> {pedido.clientes.telefono}
          </p>
        )}
      </div>

      <table className={`w-full border-collapse text-left text-sm ${BORDE}`}>
        <thead>
          <tr>
            <th className={`${BORDE} border p-2.5`}>Producto</th>
            <th className={`${BORDE} border p-2.5`}>Cantidad</th>
            <th className={`${BORDE} border p-2.5`}>Precio</th>
            <th className={`${BORDE} border p-2.5`}>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {(pedido.pedido_items || []).map((item) => (
            <tr key={item.id}>
              <td className={`${BORDE} border p-2.5`}>{item.productos?.nombre || 'Producto'}</td>
              <td className={`${BORDE} border p-2.5`}>{etiquetaCantidadUnidad(item.cantidad_unidad, item.unidad_vendida)}</td>
              <td className={`${BORDE} border p-2.5`}>${Number(item.precio_aplicado).toFixed(2)}</td>
              <td className={`${BORDE} border p-2.5`}>
                ${(Number(item.precio_aplicado) * Number(item.cantidad_unidad)).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex flex-col items-end gap-1 text-sm">
        <p className="font-mono text-lg font-medium">Total: ${Number(pedido.total).toFixed(2)}</p>
        <p>
          <strong>Estado de pago:</strong> {ETIQUETA_ESTADO_PAGO[pedido.estado_pago] || pedido.estado_pago}
          {pedido.estado_pago === 'parcial' && ` — quedan $${pendiente.toFixed(2)} pendientes`}
        </p>
      </div>

      <div className="mt-10 text-sm">
        <span>Recibí conforme: _______________________________</span>
      </div>
    </div>
  )
}
