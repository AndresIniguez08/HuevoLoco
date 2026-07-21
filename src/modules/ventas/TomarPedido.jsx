import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { obtenerProductosConStock } from '../../lib/productos'
import { obtenerPreciosLista } from '../../lib/precios'
import { buscarClientes } from '../../lib/clientes'
import { traducirError } from '../../lib/errores'
import { ETIQUETA_UNIDAD } from '../../lib/constantes'
import { usePedidoStore } from '../../stores/pedidoStore'
import { useAuthStore } from '../../stores/authStore'
import SelectorUnidad from '../../components/SelectorUnidad'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'

export default function TomarPedido() {
  const { cliente, items, setCliente, agregarItem, quitarItem, limpiar, total } = usePedidoStore()
  const usuario = useAuthStore((s) => s.usuario)

  const [productos, setProductos] = useState([])
  const [preciosLista, setPreciosLista] = useState({})
  const [cargandoPrecios, setCargandoPrecios] = useState(false)
  const [productoId, setProductoId] = useState('')
  const [precioManual, setPrecioManual] = useState('')
  const [cantidadSeleccion, setCantidadSeleccion] = useState({ unidad: 'maple', cantidad: 0, cantidad_maple: 0 })

  const [busquedaCliente, setBusquedaCliente] = useState('')
  const [resultadosCliente, setResultadosCliente] = useState([])

  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    obtenerProductosConStock().then(setProductos).catch((e) => setError(traducirError(e)))
  }, [])

  useEffect(() => {
    if (!cliente) {
      setPreciosLista({})
      return
    }
    setCargandoPrecios(true)
    obtenerPreciosLista(cliente.lista_precio_id)
      .then(setPreciosLista)
      .catch((e) => setError(traducirError(e)))
      .finally(() => setCargandoPrecios(false))
  }, [cliente])

  useEffect(() => {
    if (!busquedaCliente) {
      setResultadosCliente([])
      return
    }
    const timeout = setTimeout(() => {
      buscarClientes(busquedaCliente).then(setResultadosCliente).catch(() => {})
    }, 250)
    return () => clearTimeout(timeout)
  }, [busquedaCliente])

  const productoSeleccionado = productos.find((p) => p.id === productoId)
  // El precio de lista depende de la unidad elegida: son tres columnas
  // independientes (precio_maple/precio_caja/precio_cajon), no se derivan
  // entre sí. Si no hay precio cargado para esa unidad puntual, se trata
  // igual que "sin lista asignada" para esa línea.
  const precioListaProducto = productoSeleccionado
    ? preciosLista[productoSeleccionado.id]?.[`precio_${cantidadSeleccion.unidad}`] ?? null
    : null
  const sinListaAsignada = !!cliente && !cliente.lista_precio_id

  useEffect(() => {
    setPrecioManual('')
  }, [productoId, cantidadSeleccion.unidad])

  function agregarAlPedido() {
    if (!productoSeleccionado || cantidadSeleccion.cantidad_maple <= 0) return
    const precioFinal = precioManual !== '' ? Number(precioManual) : precioListaProducto
    if (precioFinal == null) return
    const esPrecioEspecial = precioListaProducto == null || precioFinal !== precioListaProducto

    agregarItem({
      producto_id: productoSeleccionado.id,
      nombre: productoSeleccionado.nombre,
      unidad: cantidadSeleccion.unidad,
      cantidad: cantidadSeleccion.cantidad,
      cantidad_maple: cantidadSeleccion.cantidad_maple,
      precio_aplicado: precioFinal,
      precio_lista: precioListaProducto,
      precio_especial: esPrecioEspecial,
      // precioFinal es el precio de UNA unidad de la elegida (ej: 1 cajón),
      // no de un maple — el total de la línea se calcula sobre la cantidad
      // en esa misma unidad, no sobre la cantidad convertida a maples.
      subtotal: precioFinal * cantidadSeleccion.cantidad,
    })
    setProductoId('')
    setPrecioManual('')
    setCantidadSeleccion({ unidad: 'maple', cantidad: 0, cantidad_maple: 0 })
  }

  const requiereAprobacion = items.some((it) => it.precio_especial)

  async function guardarPedido() {
    if (!cliente || items.length === 0) return
    setGuardando(true)
    setError(null)
    setMensaje(null)
    try {
      const { data: pedido, error: errorPedido } = await supabase
        .from('pedidos')
        .insert({
          cliente_id: cliente.id,
          vendedor_id: usuario.id,
          estado: 'pendiente',
          total: total(),
        })
        .select()
        .single()
      if (errorPedido) throw errorPedido

      const filas = items.map((it) => ({
        pedido_id: pedido.id,
        producto_id: it.producto_id,
        unidad_vendida: it.unidad,
        cantidad_unidad: it.cantidad,
        cantidad_maple: it.cantidad_maple,
        precio_lista: it.precio_lista,
        precio_aplicado: it.precio_aplicado,
        es_precio_especial: it.precio_especial,
      }))
      const { error: errorItems } = await supabase.from('pedido_items').insert(filas)
      if (errorItems) throw errorItems

      setMensaje(
        requiereAprobacion
          ? 'Pedido guardado. Tiene precios especiales: necesitan aprobación antes de poder confirmarse.'
          : 'Pedido guardado. Confirmalo desde "Mis pedidos".'
      )
      limpiar()
      setBusquedaCliente('')
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 font-display text-xl text-marca">Tomar pedido</h1>

      <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-medium text-marca">Cliente</h2>
        {cliente ? (
          <div>
            <div className="flex items-center justify-between">
              <span>{cliente.nombre}</span>
              <button className="text-sm text-marca-claro" onClick={() => setCliente(null)}>
                Cambiar
              </button>
            </div>
            {sinListaAsignada && (
              <p className="mt-2 text-sm text-perdida">
                Este cliente no tiene una lista de precios asignada. Ingresá el precio manualmente para cada producto.
              </p>
            )}
          </div>
        ) : (
          <div>
            <input
              value={busquedaCliente}
              onChange={(e) => setBusquedaCliente(e.target.value)}
              placeholder="Buscar cliente por nombre"
              className="w-full rounded-lg border border-marca/20 px-3 py-2 outline-none focus:border-marca-claro"
            />
            {resultadosCliente.length > 0 && (
              <ul className="mt-2 divide-y divide-marca/10 rounded-lg border border-marca/10">
                {resultadosCliente.map((c) => (
                  <li
                    key={c.id}
                    className="cursor-pointer px-3 py-2 text-sm hover:bg-marca/5"
                    onClick={() => {
                      setCliente(c)
                      setResultadosCliente([])
                    }}
                  >
                    {c.nombre}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {cliente && (
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
                    Precio x {ETIQUETA_UNIDAD[cantidadSeleccion.unidad].singular}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={
                      cargandoPrecios ? 'Cargando...' : precioListaProducto != null ? String(precioListaProducto) : 'Sin precio de lista'
                    }
                    value={precioManual}
                    onChange={(e) => setPrecioManual(e.target.value)}
                    className="w-32 rounded-lg border border-marca/20 px-3 py-2 font-mono outline-none focus:border-marca-claro"
                  />
                </label>
                <Button
                  onClick={agregarAlPedido}
                  disabled={cantidadSeleccion.cantidad_maple <= 0 || (precioListaProducto == null && precioManual === '')}
                >
                  Agregar
                </Button>
              </>
            )}
          </div>
          {productoSeleccionado && precioListaProducto == null && !cargandoPrecios && (
            <p className="mt-2 text-sm text-perdida">
              No hay precio de lista para este producto. Ingresá un precio para poder agregarlo.
            </p>
          )}
        </div>
      )}

      <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-medium text-marca">Items del pedido</h2>
        {items.length === 0 ? (
          <p className="text-sm text-marca/50">Todavía no agregaste productos.</p>
        ) : (
          <ul className="divide-y divide-marca/10">
            {items.map((it) => (
              <li key={it.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="font-medium text-marca">{it.nombre}</p>
                  <p className="text-marca/50">
                    {it.cantidad} {it.unidad} ({it.cantidad_maple} maples) · ${it.precio_aplicado} c/
                    {ETIQUETA_UNIDAD[it.unidad].singular}
                    {it.precio_especial && (
                      <Badge tono="neutro" className="ml-2">
                        Precio especial
                      </Badge>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono">${it.subtotal.toFixed(2)}</span>
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
            Total: ${total().toFixed(2)}
          </div>
        )}
      </div>

      {requiereAprobacion && items.length > 0 && (
        <p className="mb-3 text-sm text-marca">
          Este pedido tiene precios especiales y va a necesitar aprobación antes de poder confirmarse.
        </p>
      )}
      {error && <p className="mb-3 text-sm text-perdida">{error}</p>}
      {mensaje && <p className="mb-3 text-sm text-fresco">{mensaje}</p>}

      <Button
        onClick={guardarPedido}
        disabled={!cliente || items.length === 0}
        cargando={guardando}
        className="w-full"
      >
        Guardar pedido
      </Button>
    </div>
  )
}
