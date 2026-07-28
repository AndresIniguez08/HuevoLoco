import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { obtenerProductosConStock } from '../../lib/productos'
import { registrarRecepcionCompra, listarRecepcionesRecientes } from '../../lib/compras'
import { traducirError } from '../../lib/errores'
import { formatearCantidadItemCompra } from '../../lib/constantes'
import { formatearFecha } from '../../lib/formato'
import SelectorUnidad from '../../components/SelectorUnidad'
import ProveedorSelector from '../compras/ProveedorSelector'
import BotonVolverInicio from '../../components/BotonVolverInicio'
import Button from '../../components/ui/Button'

// Reemplaza el viejo flujo en dos pasos (orden de compra con costo + depósito
// confirmando cantidades, con reporte de diferencias). Ahora dueño,
// administrativo y depósito comparten esta misma pantalla: registran acá
// mismo lo que llegó del proveedor, sin costo — fn_registrar_recepcion_compra
// crea la compra directo en estado 'recibida'. El costo lo carga dueño
// después, en Compras > Cargar costo (CargarCostoCompra.jsx).
export default function RecepcionCompra() {
  const [productos, setProductos] = useState([])
  const [proveedorId, setProveedorId] = useState('')
  const [productoId, setProductoId] = useState('')
  const [cantidadSeleccion, setCantidadSeleccion] = useState({ unidad: 'maple', cantidad: 0, cantidad_maple: 0 })
  const [items, setItems] = useState([])

  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  const [compraId, setCompraId] = useState(null)
  const [error, setError] = useState(null)

  const [recientes, setRecientes] = useState([])
  const [cargandoRecientes, setCargandoRecientes] = useState(true)

  useEffect(() => {
    obtenerProductosConStock().then(setProductos).catch((e) => setError(traducirError(e)))
    cargarRecientes()
  }, [])

  async function cargarRecientes() {
    setCargandoRecientes(true)
    try {
      setRecientes(await listarRecepcionesRecientes())
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setCargandoRecientes(false)
    }
  }

  const productoSeleccionado = productos.find((p) => p.id === productoId)

  function agregarItem() {
    if (!productoSeleccionado || cantidadSeleccion.cantidad_maple <= 0) return
    // productoSeleccionado sale de un .find() sobre lo que devolvió
    // productos_publico — si esa vista no trae `id` como se espera, esto
    // corta acá en vez de sumar un producto_id undefined al carrito que
    // recién explotaría como uuid inválido al confirmar la recepción.
    if (!productoSeleccionado.id) {
      setError('Este producto no se cargó bien (falta su identificador). Recargá la página e intentá de nuevo.')
      return
    }
    setError(null)
    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
        producto_id: productoSeleccionado.id,
        nombre: productoSeleccionado.nombre,
        unidad: cantidadSeleccion.unidad,
        cantidad: cantidadSeleccion.cantidad,
        cantidad_maple: cantidadSeleccion.cantidad_maple,
      },
    ])
    setProductoId('')
    setCantidadSeleccion({ unidad: 'maple', cantidad: 0, cantidad_maple: 0 })
  }

  function quitarItem(id) {
    setItems(items.filter((it) => it.id !== id))
  }

  async function registrar() {
    if (!proveedorId || items.length === 0) return
    // Corta acá con un mensaje claro en vez de dejar que un proveedor_id o
    // producto_id vacío le llegue al RPC y vuelva como un error de uuid
    // inentendible para quien está registrando la recepción.
    if (typeof proveedorId !== 'string' || proveedorId.trim() === '') {
      setError('Elegí un proveedor antes de registrar la recepción.')
      return
    }
    const itemsSinProducto = items.filter((it) => !it.producto_id)
    if (itemsSinProducto.length > 0) {
      const nombres = itemsSinProducto.map((it) => it.nombre).join(', ')
      setError(`Estos productos no se cargaron bien: ${nombres}. Quitalos de la lista y agregalos de nuevo.`)
      return
    }
    setEnviando(true)
    setError(null)
    setMensaje(null)
    setCompraId(null)
    try {
      const id = await registrarRecepcionCompra(
        proveedorId,
        items.map((it) => ({
          producto_id: it.producto_id,
          cantidad_maple: it.cantidad_maple,
          unidad_transaccion: it.unidad,
          cantidad_unidad_transaccion: it.cantidad,
        }))
      )
      setMensaje('Recepción registrada. Dueño va a cargar el costo más adelante.')
      setCompraId(id)
      setItems([])
      setProveedorId('')
      cargarRecientes()
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <BotonVolverInicio />
      <h1 className="mb-4 font-display text-xl text-marca">Recepción de compra</h1>

      <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
        <ProveedorSelector proveedorId={proveedorId} onCambio={setProveedorId} />
      </div>

      <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-medium text-marca">Agregar producto</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-marca">Producto</span>
            <select
              value={productoId}
              onChange={(e) => setProductoId(e.target.value)}
              className="min-h-[52px] rounded-xl border border-marca/20 px-4 py-3 text-base outline-none focus:border-marca-claro"
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
              <Button className="min-h-[52px] text-base" onClick={agregarItem} disabled={cantidadSeleccion.cantidad_maple <= 0}>
                Agregar
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-medium text-marca">Productos recibidos</h2>
        {items.length === 0 ? (
          <p className="text-sm text-marca/50">Todavía no agregaste productos.</p>
        ) : (
          <ul className="divide-y divide-marca/10">
            {items.map((it) => (
              <li key={it.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="font-medium text-marca">{it.nombre}</p>
                  <p className="text-marca/50">
                    {it.cantidad} {it.unidad} ({it.cantidad_maple} maples)
                  </p>
                </div>
                <button onClick={() => quitarItem(it.id)} className="text-perdida">
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="mb-3 text-sm text-perdida">{error}</p>}
      {mensaje && <p className="mb-3 text-sm text-fresco">{mensaje}</p>}

      <Button
        onClick={registrar}
        disabled={!proveedorId || items.length === 0}
        cargando={enviando}
        className="min-h-[56px] w-full text-lg"
      >
        Registrar recepción
      </Button>

      {compraId && (
        <Button
          variante="secundario"
          onClick={() => window.open(`/compra/${compraId}/imprimir`, '_blank')}
          className="mt-3 min-h-[56px] w-full text-lg"
        >
          Imprimir comprobante
        </Button>
      )}

      <div className="mt-6 rounded-xl bg-white shadow-sm">
        <h2 className="p-4 pb-0 text-sm font-medium text-marca">Recepciones recientes</h2>
        {cargandoRecientes ? (
          <p className="p-4 text-sm text-marca/60">Cargando...</p>
        ) : recientes.length === 0 ? (
          <p className="p-4 text-sm text-marca/50">Todavía no hay recepciones registradas.</p>
        ) : (
          <ul className="divide-y divide-marca/10">
            {recientes.map((r) => (
              <li key={r.compra_id} className="flex flex-col gap-1 p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-marca">{r.proveedores?.nombre || 'Proveedor'}</p>
                  <span className="text-xs text-marca/50">{formatearFecha(r.creado_at)}</span>
                </div>
                <ul className="text-marca/60">
                  {r.items.map((it) => (
                    <li key={it.id}>
                      {it.productos?.nombre || 'Producto'} — {formatearCantidadItemCompra(it)}
                    </li>
                  ))}
                </ul>
                {r.estado === 'costeada' ? (
                  <span className="mt-1 w-fit rounded-full bg-fresco/10 px-2 py-0.5 text-xs font-medium text-fresco">
                    Costeada
                  </span>
                ) : (
                  <span className="mt-1 w-fit rounded-full bg-yema/15 px-2 py-0.5 text-xs font-medium text-yema">
                    Pendiente de costear
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
