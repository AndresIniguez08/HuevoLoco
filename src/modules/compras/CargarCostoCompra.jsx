import { useState } from 'react'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { listarComprasPendientesCosteo, cargarCostoCompra } from '../../lib/compras'
import { traducirError } from '../../lib/errores'
import { formatearCantidadItemCompra } from '../../lib/constantes'
import { formatearFecha, formatearMoneda } from '../../lib/formato'
import { useRefrescoPeriodico } from '../../hooks/useRefrescoPeriodico'
import Button from '../../components/ui/Button'

// Exclusivo de dueño — ver comentario en RecepcionCompra.jsx sobre el flujo
// en dos pasos. Acá se cierra el segundo paso: se le pone precio a lo que ya
// se recibió, y recién ahí se genera la deuda real con el proveedor.
export default function CargarCostoCompra() {
  const [compras, setCompras] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [compraActiva, setCompraActiva] = useState(null)

  useRefrescoPeriodico(
    async () => {
      try {
        const data = await listarComprasPendientesCosteo()
        setCompras(data)
        setError(null)
      } catch (e) {
        setError(traducirError(e))
      } finally {
        setCargando(false)
      }
    },
    { activo: !compraActiva }
  )

  function volver(recargar) {
    setCompraActiva(null)
    if (recargar) {
      setCargando(true)
      listarComprasPendientesCosteo()
        .then(setCompras)
        .catch((e) => setError(traducirError(e)))
        .finally(() => setCargando(false))
    }
  }

  if (compraActiva) {
    return <FormularioCosteo compra={compraActiva} onVolver={volver} />
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 font-display text-xl text-marca">Cargar costo</h1>
      <p className="mb-4 text-sm text-marca/60">
        Compras ya recibidas, pendientes de cargarles el costo. Al cargarlo se genera la deuda real con el proveedor.
      </p>

      {error && <p className="mb-3 text-sm text-perdida">{error}</p>}

      <div className="rounded-xl bg-white shadow-sm">
        {cargando ? (
          <p className="p-4 text-sm text-marca/60">Cargando...</p>
        ) : compras.length === 0 ? (
          <p className="p-4 text-sm text-marca/50">No hay compras pendientes de costear.</p>
        ) : (
          <ul className="divide-y divide-marca/10">
            {compras.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                <div>
                  <p className="font-medium text-marca">{c.proveedores?.nombre || 'Proveedor'}</p>
                  <p className="text-marca/50">{formatearFecha(c.creado_at)}</p>
                  <ul className="mt-1 text-marca/60">
                    {(c.compra_items || []).map((it) => (
                      <li key={it.id}>
                        {it.productos?.nombre || 'Producto'} — {formatearCantidadItemCompra(it)}
                      </li>
                    ))}
                  </ul>
                </div>
                <Button tamano="sm" onClick={() => setCompraActiva(c)}>
                  Cargar costos
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function FormularioCosteo({ compra, onVolver }) {
  const [costos, setCostos] = useState(() => Object.fromEntries(compra.compra_items.map((it) => [it.id, ''])))
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const [listo, setListo] = useState(false)

  function cambiarCosto(itemId, valor) {
    setCostos((prev) => ({ ...prev, [itemId]: valor }))
  }

  const faltanCostos = compra.compra_items.some((it) => costos[it.id] === '' || Number(costos[it.id]) <= 0)

  async function confirmar() {
    setEnviando(true)
    setError(null)
    try {
      await cargarCostoCompra(
        compra.id,
        compra.compra_items.map((it) => ({
          producto_id: it.producto_id,
          costo_unitario: Number(costos[it.id]),
        }))
      )
      setListo(true)
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setEnviando(false)
    }
  }

  if (listo) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 py-10 text-center">
        <CheckCircle size={40} className="text-fresco" />
        <p className="text-lg font-medium text-marca">Costo cargado</p>
        <p className="text-sm text-marca/60">
          La compra a {compra.proveedores?.nombre || 'proveedor'} quedó costeada y ya generó la deuda correspondiente
          en su cuenta corriente.
        </p>
        <Button onClick={() => onVolver(true)} className="mt-2">
          Volver al listado
        </Button>
      </div>
    )
  }

  const total = compra.compra_items.reduce((acc, it) => acc + (Number(costos[it.id]) || 0) * Number(it.cantidad_maple), 0)

  return (
    <div className="mx-auto max-w-2xl">
      <button onClick={() => onVolver(false)} className="mb-4 flex items-center gap-2 text-sm text-marca">
        <ArrowLeft size={18} /> Volver
      </button>

      <h1 className="mb-1 font-display text-xl text-marca">{compra.proveedores?.nombre || 'Proveedor'}</h1>
      <p className="mb-4 text-sm text-marca/60">Recibida el {formatearFecha(compra.creado_at)}</p>

      <div className="rounded-xl bg-white shadow-sm">
        <ul className="divide-y divide-marca/10">
          {compra.compra_items.map((it) => (
            <li key={it.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
              <div>
                <p className="font-medium text-marca">{it.productos?.nombre || 'Producto'}</p>
                <p className="text-marca/50">{formatearCantidadItemCompra(it)}</p>
              </div>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-marca">Costo x maple</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={costos[it.id]}
                  onChange={(e) => cambiarCosto(it.id, e.target.value)}
                  className="w-32 rounded-lg border border-marca/20 px-3 py-2 font-mono outline-none focus:border-marca-claro"
                />
              </label>
            </li>
          ))}
        </ul>
      </div>

      {total > 0 && (
        <p className="mt-3 flex justify-end font-mono text-lg text-marca">Total: {formatearMoneda(total)}</p>
      )}

      {error && <p className="mt-3 text-sm text-perdida">{error}</p>}

      <Button
        onClick={confirmar}
        disabled={faltanCostos}
        cargando={enviando}
        className="mt-4 min-h-[56px] w-full text-lg"
      >
        Cargar costos
      </Button>
    </div>
  )
}
