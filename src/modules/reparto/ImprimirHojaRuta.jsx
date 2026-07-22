import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { obtenerHojaRuta } from '../../lib/reparto'
import { obtenerCamioneta } from '../../lib/camionetas'
import { obtenerNombrePerfil } from '../../lib/usuarios'
import { obtenerTotalesPagadosPorPedidos } from '../../lib/cobranzas'
import { traducirError } from '../../lib/errores'
import { ETIQUETA_UNIDAD } from '../../lib/constantes'

const BORDE = 'border-[#333]'

function resumenProductos(items) {
  return (items || [])
    .map((it) => {
      const et = ETIQUETA_UNIDAD[it.unidad_vendida]
      const etiquetaUnidad = et ? (Number(it.cantidad_unidad) === 1 ? et.singular : et.plural) : it.unidad_vendida
      return `${it.cantidad_unidad} ${etiquetaUnidad} — ${it.productos?.nombre || 'Producto'}`
    })
    .join(', ')
}

export default function ImprimirHojaRuta() {
  const { choferId, camionetaId, fecha } = useParams()
  const [entregas, setEntregas] = useState([])
  const [saldosPorPedido, setSaldosPorPedido] = useState(new Map())
  const [chofer, setChofer] = useState(null)
  const [camioneta, setCamioneta] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([obtenerHojaRuta(choferId, camionetaId, fecha), obtenerNombrePerfil(choferId), obtenerCamioneta(camionetaId)])
      .then(async ([datosEntregas, nombreChofer, datosCamioneta]) => {
        setEntregas(datosEntregas)
        setChofer(nombreChofer)
        setCamioneta(datosCamioneta)
        const idsConSaldo = datosEntregas.filter((e) => e.pedidos).map((e) => e.pedido_id)
        const totalesPagados = await obtenerTotalesPagadosPorPedidos(idsConSaldo)
        const saldos = new Map()
        for (const e of datosEntregas) {
          if (!e.pedidos) continue
          saldos.set(e.pedido_id, Number(e.pedidos.total) - (totalesPagados.get(e.pedido_id) || 0))
        }
        setSaldosPorPedido(saldos)
      })
      .catch((e) => setError(traducirError(e)))
      .finally(() => setCargando(false))
  }, [choferId, camionetaId, fecha])

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
        Imprimir hoja de ruta
      </button>

      <header className="mb-6">
        <h1 className="font-display text-2xl leading-none">Huevo Loco — Hoja de ruta</h1>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-2 text-sm">
          <span>
            <strong>Chofer:</strong> {chofer || '—'}
          </span>
          <span>
            <strong>Camioneta:</strong>{' '}
            {camioneta?.patente ? `${camioneta.nombre} — ${camioneta.patente}` : camioneta?.nombre || '—'}
          </span>
          <span>
            <strong>Fecha:</strong> {new Date(`${fecha}T00:00:00`).toLocaleDateString('es-AR')}
          </span>
        </div>
      </header>

      <table className={`w-full border-collapse text-left text-sm ${BORDE}`}>
        <colgroup>
          <col className="w-[18%]" />
          <col className="w-[22%]" />
          <col className="w-[13%]" />
          <col className="w-[27%]" />
          <col className="w-[10%]" />
          <col className="w-[10%]" />
        </colgroup>
        <thead>
          <tr>
            <th className={`${BORDE} border p-2.5`}>Cliente</th>
            <th className={`${BORDE} border p-2.5`}>Dirección</th>
            <th className={`${BORDE} border p-2.5`}>Teléfono</th>
            <th className={`${BORDE} border p-2.5`}>Productos</th>
            <th className={`${BORDE} border p-2.5`}>A cobrar</th>
            <th className={`${BORDE} border p-2.5`}>Entregado</th>
          </tr>
        </thead>
        <tbody>
          {entregas.map((e) => {
            const saldo = saldosPorPedido.get(e.pedido_id) || 0
            return (
              <tr key={e.id}>
                <td className={`${BORDE} border p-2.5`}>{e.pedidos?.clientes?.nombre || '—'}</td>
                <td className={`${BORDE} border p-2.5`}>{e.pedidos?.clientes?.direccion || '—'}</td>
                <td className={`${BORDE} border p-2.5`}>{e.pedidos?.clientes?.telefono || '—'}</td>
                <td className={`${BORDE} border p-2.5`}>{resumenProductos(e.pedidos?.pedido_items)}</td>
                <td className={`${BORDE} border p-2.5`}>{saldo > 0 ? `$${saldo.toFixed(2)}` : '—'}</td>
                <td className={`${BORDE} border p-2.5`}>&nbsp;</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
