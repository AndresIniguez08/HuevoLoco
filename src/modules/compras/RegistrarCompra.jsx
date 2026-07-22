import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { obtenerProductosConStock } from '../../lib/productos'
import { registrarCompra as registrarCompraRpc } from '../../lib/compras'
import { traducirError } from '../../lib/errores'
import SelectorUnidad from '../../components/SelectorUnidad'
import Button from '../../components/ui/Button'
import ProveedorSelector from './ProveedorSelector'

export default function RegistrarCompra({ titulo = 'Registrar compra' }) {
  const [productos, setProductos] = useState([])
  const [proveedorId, setProveedorId] = useState('')
  const [productoId, setProductoId] = useState('')
  const [costoManual, setCostoManual] = useState('')
  const [cantidadSeleccion, setCantidadSeleccion] = useState({ unidad: 'maple', cantidad: 0, cantidad_maple: 0 })
  const [items, setItems] = useState([])

  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  const [compraId, setCompraId] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    obtenerProductosConStock().then(setProductos).catch((e) => setError(traducirError(e)))
  }, [])

  const productoSeleccionado = productos.find((p) => p.id === productoId)

  function agregarItem() {
    if (!productoSeleccionado || cantidadSeleccion.cantidad_maple <= 0 || costoManual === '') return
    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
        producto_id: productoSeleccionado.id,
        nombre: productoSeleccionado.nombre,
        unidad: cantidadSeleccion.unidad,
        cantidad: cantidadSeleccion.cantidad,
        cantidad_maple: cantidadSeleccion.cantidad_maple,
        costo_unitario: Number(costoManual),
      },
    ])
    setProductoId('')
    setCostoManual('')
    setCantidadSeleccion({ unidad: 'maple', cantidad: 0, cantidad_maple: 0 })
  }

  function quitarItem(id) {
    setItems(items.filter((it) => it.id !== id))
  }

  async function registrarCompra() {
    if (!proveedorId || items.length === 0) return
    setEnviando(true)
    setError(null)
    setMensaje(null)
    setCompraId(null)
    try {
      const id = await registrarCompraRpc(
        proveedorId,
        items.map((it) => ({
          producto_id: it.producto_id,
          cantidad_maple: it.cantidad_maple,
          costo_unitario: it.costo_unitario,
          unidad_transaccion: it.unidad,
          cantidad_unidad_transaccion: it.cantidad,
        }))
      )
      setMensaje('Compra registrada. El stock ya se actualizó.')
      setCompraId(id)
      setItems([])
      setProveedorId('')
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setEnviando(false)
    }
  }

  const totalCompra = items.reduce((acc, it) => acc + it.costo_unitario * it.cantidad_maple, 0)

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 font-display text-xl text-marca">{titulo}</h1>

      <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
        <ProveedorSelector proveedorId={proveedorId} onCambio={setProveedorId} />
      </div>

      <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-medium text-marca">Agregar producto recibido</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-marca">Producto</span>
            <select
              value={productoId}
              onChange={(e) => setProductoId(e.target.value)}
              className="rounded-lg border border-marca/20 px-3 py-2 outline-none focus:border-marca-claro"
            >
              <option value="">Elegir...</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>

          {productoSeleccionado && (
            <>
              <SelectorUnidad producto={productoSeleccionado} onCambio={setCantidadSeleccion} />
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-marca">Costo x maple</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={costoManual}
                  onChange={(e) => setCostoManual(e.target.value)}
                  className="w-28 rounded-lg border border-marca/20 px-3 py-2 font-mono outline-none focus:border-marca-claro"
                />
              </label>
              <Button onClick={agregarItem}>Agregar</Button>
            </>
          )}
        </div>
      </div>

      <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-medium text-marca">Items recibidos</h2>
        {items.length === 0 ? (
          <p className="text-sm text-marca/50">Todavía no agregaste productos.</p>
        ) : (
          <ul className="divide-y divide-marca/10">
            {items.map((it) => (
              <li key={it.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="font-medium text-marca">{it.nombre}</p>
                  <p className="text-marca/50">
                    {it.cantidad} {it.unidad} ({it.cantidad_maple} maples) · ${it.costo_unitario} c/maple
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono">${(it.costo_unitario * it.cantidad_maple).toFixed(2)}</span>
                  <button onClick={() => quitarItem(it.id)} className="text-perdida">
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {items.length > 0 && (
          <div className="mt-3 flex justify-end border-t border-marca/10 pt-3 font-mono text-lg text-marca">
            Total: ${totalCompra.toFixed(2)}
          </div>
        )}
      </div>

      {error && <p className="mb-3 text-sm text-perdida">{error}</p>}
      {mensaje && <p className="mb-3 text-sm text-fresco">{mensaje}</p>}

      <Button
        onClick={registrarCompra}
        disabled={!proveedorId || items.length === 0}
        cargando={enviando}
        className="w-full"
      >
        Registrar compra
      </Button>

      {compraId && (
        <Button
          variante="secundario"
          onClick={() => window.open(`/compra/${compraId}/imprimir`, '_blank')}
          className="mt-3 w-full"
        >
          Imprimir comprobante
        </Button>
      )}
    </div>
  )
}
