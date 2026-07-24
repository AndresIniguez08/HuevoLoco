import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { obtenerProductosConStock } from '../../lib/productos'
import { crearCompra, listarComprasDiferencia, revisarCompra } from '../../lib/compras'
import { traducirError } from '../../lib/errores'
import { ETIQUETA_UNIDAD } from '../../lib/constantes'
import SelectorUnidad, { convertirAMaple } from '../../components/SelectorUnidad'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import ProveedorSelector from './ProveedorSelector'

function FilaDiferencia({ compra, onRevisar, revisando }) {
  return (
    <li className="flex flex-col gap-2 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium text-marca">{compra.proveedores?.nombre || 'Proveedor'}</p>
        <span className="text-xs text-marca/50">{new Date(compra.creado_at).toLocaleDateString('es-AR')}</span>
      </div>
      <p className="text-marca/60">Recibida por: {compra.receptor?.nombre || '—'}</p>
      {compra.observacion_diferencia && <p className="text-marca/70">"{compra.observacion_diferencia}"</p>}
      {compra.revisado ? (
        <p className="text-marca/60">Revisado por: {compra.revisor?.nombre || '—'}</p>
      ) : (
        <div className="mt-1">
          <Button tamano="sm" variante="confirmar" cargando={revisando} onClick={() => onRevisar(compra.id)}>
            Marcar como revisado
          </Button>
        </div>
      )}
    </li>
  )
}

export default function RegistrarCompra() {
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

  const [diferencias, setDiferencias] = useState([])
  const [cargandoDiferencias, setCargandoDiferencias] = useState(true)
  const [revisandoId, setRevisandoId] = useState(null)
  const [mostrarRevisadas, setMostrarRevisadas] = useState(false)

  useEffect(() => {
    obtenerProductosConStock().then(setProductos).catch((e) => setError(traducirError(e)))
    cargarDiferencias()
  }, [])

  async function cargarDiferencias() {
    setCargandoDiferencias(true)
    try {
      const data = await listarComprasDiferencia()
      setDiferencias(data)
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setCargandoDiferencias(false)
    }
  }

  async function revisar(id) {
    setRevisandoId(id)
    setError(null)
    try {
      await revisarCompra(id)
      await cargarDiferencias()
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setRevisandoId(null)
    }
  }

  const diferenciasPendientes = diferencias.filter((d) => !d.revisado)
  const diferenciasRevisadas = diferencias.filter((d) => d.revisado)

  const productoSeleccionado = productos.find((p) => p.id === productoId)

  function agregarItem() {
    if (!productoSeleccionado || cantidadSeleccion.cantidad_maple <= 0 || costoManual === '') return
    // fn_crear_compra guarda costo_unitario por maple (depósito recién lo
    // vuelca al costo promedio ponderado al confirmar la recepción, pero ya
    // en esa unidad), así que si el usuario cargó el costo por caja o cajón
    // hay que convertirlo acá antes de guardarlo/enviarlo.
    const equivalenciaUnidad = convertirAMaple(1, cantidadSeleccion.unidad, productoSeleccionado) || 1
    const costoUnitarioMaple = Number(costoManual) / equivalenciaUnidad
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
        costo_unitario_maple: costoUnitarioMaple,
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
      const id = await crearCompra(
        proveedorId,
        items.map((it) => ({
          producto_id: it.producto_id,
          cantidad_maple: it.cantidad_maple,
          costo_unitario: it.costo_unitario_maple,
          unidad_transaccion: it.unidad,
          cantidad_unidad_transaccion: it.cantidad,
        }))
      )
      setMensaje('Orden de compra creada. Depósito la va a confirmar cuando llegue la mercadería.')
      setCompraId(id)
      setItems([])
      setProveedorId('')
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setEnviando(false)
    }
  }

  const totalCompra = items.reduce((acc, it) => acc + it.costo_unitario_maple * it.cantidad_maple, 0)

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center gap-2">
        <h1 className="font-display text-xl text-marca">Registrar compra</h1>
        {diferenciasPendientes.length > 0 && <Badge tono="error">{diferenciasPendientes.length} con diferencia</Badge>}
      </div>

      {!cargandoDiferencias && diferencias.length > 0 && (
        <div className="mb-6 flex flex-col gap-3">
          <div className="rounded-xl bg-white shadow-sm">
            <h2 className="p-4 pb-0 text-sm font-medium text-marca">Con diferencia, sin revisar</h2>
            {diferenciasPendientes.length === 0 ? (
              <p className="p-4 text-sm text-marca/50">No hay diferencias pendientes de revisión.</p>
            ) : (
              <ul className="divide-y divide-marca/10">
                {diferenciasPendientes.map((c) => (
                  <FilaDiferencia key={c.id} compra={c} revisando={revisandoId === c.id} onRevisar={revisar} />
                ))}
              </ul>
            )}
          </div>

          {diferenciasRevisadas.length > 0 && (
            <div className="rounded-xl bg-white shadow-sm">
              <button
                onClick={() => setMostrarRevisadas((v) => !v)}
                className="flex w-full items-center justify-between p-4 text-sm font-medium text-marca"
              >
                Revisadas ({diferenciasRevisadas.length})
                <span className="text-marca/50">{mostrarRevisadas ? 'Ocultar' : 'Mostrar'}</span>
              </button>
              {mostrarRevisadas && (
                <ul className="divide-y divide-marca/10 border-t border-marca/10">
                  {diferenciasRevisadas.map((c) => (
                    <FilaDiferencia key={c.id} compra={c} revisando={false} onRevisar={() => {}} />
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

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
                <span className="font-medium text-marca">
                  Costo x {ETIQUETA_UNIDAD[cantidadSeleccion.unidad].singular}
                </span>
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
        <h2 className="mb-3 text-sm font-medium text-marca">Items de la compra</h2>
        {items.length === 0 ? (
          <p className="text-sm text-marca/50">Todavía no agregaste productos.</p>
        ) : (
          <ul className="divide-y divide-marca/10">
            {items.map((it) => (
              <li key={it.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="font-medium text-marca">{it.nombre}</p>
                  <p className="text-marca/50">
                    {it.cantidad} {it.unidad} ({it.cantidad_maple} maples) · ${it.costo_unitario} c/
                    {ETIQUETA_UNIDAD[it.unidad].singular}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono">${(it.costo_unitario_maple * it.cantidad_maple).toFixed(2)}</span>
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
