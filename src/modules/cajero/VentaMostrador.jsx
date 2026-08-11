import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { obtenerProductosConStock } from '../../lib/productos'
import { obtenerPreciosLista } from '../../lib/precios'
import { obtenerClienteConsumidorFinal, crearCliente } from '../../lib/clientes'
import { crearVentaSucursal, completarVentaSucursal } from '../../lib/ventaSucursal'
import { traducirError } from '../../lib/errores'
import { MEDIOS_PAGO, etiquetaUnidad } from '../../lib/constantes'
import { formatearMoneda } from '../../lib/formato'
import SelectorUnidad from '../../components/SelectorUnidad'
import BuscadorCliente from '../../components/BuscadorCliente'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'

const MEDIOS_MOSTRADOR = MEDIOS_PAGO.filter((m) => m.value !== 'cuenta_corriente')

// Mismo criterio que VentaSucursal.jsx: la venta puede quedar creada pero sin
// cobrar si el cliente no tiene cuenta corriente autorizada para cubrir la
// diferencia — acá no debería pasar casi nunca (Consumidor Final no suele
// tener CC), pero se deja el mismo manejo por las dudas.
function necesitaAutorizacion(mensaje) {
  return /cuenta corriente autorizada|l[ií]mite autorizado/i.test(mensaje || '')
}
function esErrorStockInsuficiente(mensaje) {
  return /no hay stock suficiente/i.test(mensaje || '')
}

function cantidadVacia() {
  return { unidad: 'maple', cantidad: 0, cantidad_maple: 0 }
}

// BuscadorCliente busca sin acotar por sucursal (a diferencia del buscador
// propio de VentaSucursal.jsx): el mostrador de Casa Central puede cobrarle a
// cualquier cliente registrado, no solo a los que se dieron de alta ahí.
// Adentro del mismo modal, "+ Nuevo cliente" reemplaza el buscador por un
// alta mínima (nombre + teléfono) — mismo criterio que PasoNuevoCliente en
// VentaSucursal.jsx, sin salir de la pantalla de venta.
function ModalElegirCliente({ abierto, sucursalId, onCerrar, onElegir }) {
  const [mostrandoNuevo, setMostrandoNuevo] = useState(false)
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (abierto) {
      setMostrandoNuevo(false)
      setNombre('')
      setTelefono('')
      setError(null)
    }
  }, [abierto])

  async function guardarNuevo() {
    if (!nombre.trim()) return
    setEnviando(true)
    setError(null)
    try {
      const cliente = await crearCliente({
        nombre: nombre.trim(),
        telefono: telefono.trim() || null,
        tipo: 'minorista',
        lista_precio_id: null,
        direccion: null,
        email: null,
        sucursal_id: sucursalId,
      })
      onElegir(cliente)
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={mostrandoNuevo ? 'Nuevo cliente' : 'Elegir cliente'}>
      {mostrandoNuevo ? (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-marca">Nombre</span>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoFocus
              className="rounded-xl border border-marca/20 px-4 py-3 text-lg outline-none focus:border-marca-claro"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-marca">Teléfono (opcional)</span>
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              inputMode="tel"
              className="rounded-xl border border-marca/20 px-4 py-3 text-lg outline-none focus:border-marca-claro"
            />
          </label>

          {error && <p className="text-sm text-perdida">{error}</p>}

          <div className="flex gap-2">
            <Button variante="secundario" className="flex-1" onClick={() => setMostrandoNuevo(false)}>
              Volver
            </Button>
            <Button
              variante="confirmar"
              className="flex-1"
              disabled={!nombre.trim()}
              cargando={enviando}
              onClick={guardarNuevo}
            >
              Guardar y elegir
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <BuscadorCliente onSeleccionar={onElegir} />
          <button
            onClick={() => setMostrandoNuevo(true)}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-marca/20 text-base font-medium text-marca"
          >
            <Plus size={18} /> Nuevo cliente
          </button>
        </div>
      )}
    </Modal>
  )
}

export default function VentaMostrador() {
  const perfil = useAuthStore((s) => s.perfil)

  const [cliente, setCliente] = useState(null)
  const [cargandoInicial, setCargandoInicial] = useState(true)
  const [errorInicial, setErrorInicial] = useState(null)

  const [productos, setProductos] = useState([])
  const [preciosLista, setPreciosLista] = useState({})
  const [productoId, setProductoId] = useState('')
  const [busquedaProducto, setBusquedaProducto] = useState('')
  const [precioManual, setPrecioManual] = useState('')
  const [cantidadSeleccion, setCantidadSeleccion] = useState(cantidadVacia())
  const [items, setItems] = useState([])

  const [medio, setMedio] = useState('efectivo')
  const [entregado, setEntregado] = useState('')
  const [entregadoTocado, setEntregadoTocado] = useState(false)
  const [pedidoId, setPedidoId] = useState(null)

  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const [aviso, setAviso] = useState(null)
  const [selectorClienteAbierto, setSelectorClienteAbierto] = useState(false)

  // Casa Central siempre vende su catálogo completo (no pasa por
  // producto_sucursal, que solo habilita productos por sucursal remota) —
  // por eso obtenerProductosConStock() y no obtenerProductosHabilitadosSucursal.
  useEffect(() => {
    if (!perfil?.sucursal_id) return
    setCargandoInicial(true)
    Promise.all([obtenerClienteConsumidorFinal(perfil.sucursal_id), obtenerProductosConStock()])
      .then(([c, p]) => {
        setCliente(c)
        setProductos(p)
        // A diferencia de un fallo real de carga, esto no bloquea la
        // pantalla: el cajero puede elegir otro cliente desde acá mismo
        // (mismo criterio que VentaSucursal.jsx) mientras avisa a Central.
        if (!c) {
          setError(
            'No existe el cliente "Consumidor Final" para Casa Central. Elegí un cliente para poder vender, o avisá a Central para que lo carguen.'
          )
        }
      })
      .catch((e) => setErrorInicial(traducirError(e)))
      .finally(() => setCargandoInicial(false))
  }, [perfil?.sucursal_id])

  useEffect(() => {
    if (!cliente?.lista_precio_id) {
      setPreciosLista({})
      return
    }
    obtenerPreciosLista(cliente.lista_precio_id)
      .then(setPreciosLista)
      .catch((e) => setError(traducirError(e)))
  }, [cliente])

  const productoSeleccionado = productos.find((p) => p.id === productoId)
  const precioListaProducto = productoSeleccionado
    ? preciosLista[productoSeleccionado.id]?.[`precio_${cantidadSeleccion.unidad}`] ?? null
    : null

  // Buscador en vez de desplegable: con todo el catálogo listado, encontrar
  // un producto puntual significaba scrollear una lista larga. Coincidencia
  // simple por texto contenido en el nombre, tope de 6 sugerencias para no
  // saturar la pantalla táctil.
  const sugerenciasProducto = productoSeleccionado
    ? []
    : productos.filter((p) => p.nombre.toLowerCase().includes(busquedaProducto.trim().toLowerCase())).slice(0, 6)

  function seleccionarProducto(p) {
    setProductoId(p.id)
    setBusquedaProducto('')
  }

  function cambiarProducto() {
    setProductoId('')
    setBusquedaProducto('')
  }

  useEffect(() => {
    setPrecioManual('')
  }, [productoId, cantidadSeleccion.unidad])

  function agregarAlCarrito() {
    if (!productoSeleccionado || cantidadSeleccion.cantidad_maple <= 0) return
    const precioFinal = precioManual !== '' ? Number(precioManual) : precioListaProducto
    if (precioFinal == null) return
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        producto_id: productoSeleccionado.id,
        nombre: productoSeleccionado.nombre,
        unidad: cantidadSeleccion.unidad,
        cantidad: cantidadSeleccion.cantidad,
        cantidad_maple: cantidadSeleccion.cantidad_maple,
        precio_lista: precioListaProducto,
        precio_aplicado: precioFinal,
        subtotal: precioFinal * cantidadSeleccion.cantidad,
      },
    ])
    setProductoId('')
    setBusquedaProducto('')
    setPrecioManual('')
    setCantidadSeleccion(cantidadVacia())
  }

  function quitarItem(id) {
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

  const total = items.reduce((acc, it) => acc + it.subtotal, 0)

  // El campo se sugiere en el total mientras el cajero no lo haya tocado a
  // mano (venta justa, el caso más común) — apenas lo edita, queda en sus
  // manos hasta el próximo reseteo.
  useEffect(() => {
    if (!entregadoTocado) setEntregado(total > 0 ? String(total) : '')
  }, [total, entregadoTocado])

  const entregadoNum = Number(entregado) || 0
  const vuelto = medio === 'efectivo' && entregadoNum > total ? entregadoNum - total : 0
  const puedeConfirmar = items.length > 0 && !!cliente && entregadoNum > 0 && !enviando

  function resetearTodo() {
    setItems([])
    setProductoId('')
    setBusquedaProducto('')
    setPrecioManual('')
    setCantidadSeleccion(cantidadVacia())
    setMedio('efectivo')
    setEntregado('')
    setEntregadoTocado(false)
    setPedidoId(null)
    setError(null)
    // El cliente no debe quedar "pegado" de una venta a la siguiente — vuelve
    // a Consumidor Final por default, igual que al entrar a la pantalla.
    if (perfil?.sucursal_id) {
      obtenerClienteConsumidorFinal(perfil.sucursal_id)
        .then(setCliente)
        .catch(() => {})
    }
  }

  async function confirmarVenta() {
    setEnviando(true)
    setError(null)
    try {
      let pid = pedidoId
      if (!pid) {
        pid = await crearVentaSucursal(
          cliente.id,
          items.map((it) => ({
            producto_id: it.producto_id,
            unidad_vendida: it.unidad,
            cantidad_unidad: it.cantidad,
            cantidad_maple: it.cantidad_maple,
            precio_lista: it.precio_lista,
            precio_aplicado: it.precio_aplicado,
          }))
        )
        setPedidoId(pid)
      }
      // Lo que excede el total es vuelto, no ingreso: al backend solo se le
      // manda a cubrir el total de la venta (o lo entregado, si es menos).
      const montoAPagar = Math.min(entregadoNum, total)
      await completarVentaSucursal(pid, [{ monto: montoAPagar, medio }])

      const totalVendido = total
      resetearTodo()
      setAviso(`Venta registrada — ${formatearMoneda(totalVendido)}`)
    } catch (e) {
      const mensaje = e.message || ''
      if (necesitaAutorizacion(mensaje)) {
        setError('Falta cubrir el total: Consumidor Final no tiene cuenta corriente para dejar saldo pendiente.')
      } else if (esErrorStockInsuficiente(mensaje)) {
        setError(mensaje)
      } else {
        setError(traducirError(e))
      }
    } finally {
      setEnviando(false)
    }
  }

  useEffect(() => {
    if (!aviso) return
    const timeout = setTimeout(() => setAviso(null), 2800)
    return () => clearTimeout(timeout)
  }, [aviso])

  if (cargandoInicial) {
    return <p className="p-6 text-center text-marca/60">Cargando...</p>
  }

  if (errorInicial) {
    return <p className="p-6 text-center text-perdida">{errorInicial}</p>
  }

  return (
    <div className="relative flex flex-col gap-4">
      {aviso && (
        <div className="fixed left-1/2 top-4 z-[60] -translate-x-1/2 rounded-xl bg-fresco px-5 py-3 text-center text-base font-medium text-white shadow-lg">
          {aviso}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-marca/10 p-4">
        <div>
          <p className="text-sm text-marca/50">Cliente</p>
          <p className="text-lg font-medium text-marca">{cliente?.nombre || 'Sin cliente'}</p>
        </div>
        <button
          onClick={() => setSelectorClienteAbierto(true)}
          className="shrink-0 text-sm font-medium text-marca-claro underline"
        >
          Elegir cliente
        </button>
      </div>

      <div className="rounded-2xl border border-marca/10 p-4">
        <p className="mb-2 text-sm font-medium text-marca">Agregar producto</p>

        {productoSeleccionado ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-marca/20 px-4 py-3">
            <span className="text-lg font-medium text-marca">{productoSeleccionado.nombre}</span>
            <button
              type="button"
              onClick={cambiarProducto}
              className="shrink-0 text-sm font-medium text-marca-claro underline"
            >
              Cambiar
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              type="text"
              value={busquedaProducto}
              onChange={(e) => setBusquedaProducto(e.target.value)}
              placeholder="Buscar producto..."
              autoComplete="off"
              className="w-full rounded-xl border border-marca/20 px-4 py-3 text-lg outline-none focus:border-marca-claro"
            />
            {busquedaProducto.trim() !== '' && sugerenciasProducto.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-marca/20 bg-white shadow-lg">
                {sugerenciasProducto.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => seleccionarProducto(p)}
                      className="flex min-h-[48px] w-full items-center px-4 text-left text-lg text-marca hover:bg-marca/5"
                    >
                      {p.nombre}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {productoSeleccionado && (
          <div className="mt-3 flex flex-col gap-3">
            <SelectorUnidad producto={productoSeleccionado} onCambio={setCantidadSeleccion} />
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-marca">Precio x {etiquetaUnidad(cantidadSeleccion.unidad).singular}</span>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder={precioListaProducto != null ? String(precioListaProducto) : 'Ingresar precio'}
                value={precioManual}
                onChange={(e) => setPrecioManual(e.target.value)}
                className="w-full rounded-xl border border-marca/20 px-4 py-3 text-xl font-mono outline-none focus:border-marca-claro"
              />
            </label>
            <Button
              className="min-h-[56px] w-full text-lg"
              onClick={agregarAlCarrito}
              disabled={cantidadSeleccion.cantidad_maple <= 0 || (precioListaProducto == null && precioManual === '')}
            >
              Agregar al carrito
            </Button>
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="rounded-2xl border border-marca/10 p-4">
          <p className="mb-2 text-sm font-medium text-marca">Carrito</p>
          <ul className="divide-y divide-marca/10">
            {items.map((it) => (
              <li key={it.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-marca">{it.nombre}</p>
                  <p className="text-sm text-marca/60">
                    {it.cantidad} {etiquetaUnidad(it.unidad).plural} · {formatearMoneda(it.precio_aplicado)} c/
                    {etiquetaUnidad(it.unidad).singular}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono">{formatearMoneda(it.subtotal)}</span>
                  <button onClick={() => quitarItem(it.id)} aria-label="Quitar producto" className="text-perdida">
                    <Trash2 size={18} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex justify-end border-t border-marca/10 pt-3 font-mono text-2xl text-marca">
            {formatearMoneda(total)}
          </p>
        </div>
      )}

      {items.length > 0 && (
        <div className="rounded-2xl border border-marca/10 p-4">
          <p className="mb-3 text-sm font-medium text-marca">Cobro</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex flex-1 flex-col gap-1 text-sm">
              <span className="font-medium text-marca">Plata que entrega el cliente</span>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={entregado}
                onChange={(e) => {
                  setEntregadoTocado(true)
                  setEntregado(e.target.value)
                }}
                className="rounded-xl border border-marca/20 px-4 py-3 text-xl font-mono outline-none focus:border-marca-claro"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm">
              <span className="font-medium text-marca">Medio de pago</span>
              <select
                value={medio}
                onChange={(e) => setMedio(e.target.value)}
                className="rounded-xl border border-marca/20 px-4 py-3 text-lg outline-none focus:border-marca-claro"
              >
                {MEDIOS_MOSTRADOR.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {vuelto > 0 && (
            <p className="mt-3 text-center text-lg font-medium text-marca">
              Vuelto: <span className="font-mono">{formatearMoneda(vuelto)}</span>
            </p>
          )}
        </div>
      )}

      {error && <p className="text-center text-base text-perdida">{error}</p>}

      <Button
        variante="confirmar"
        className="min-h-[64px] w-full text-xl"
        disabled={!puedeConfirmar}
        cargando={enviando}
        onClick={confirmarVenta}
      >
        Confirmar
      </Button>

      <ModalElegirCliente
        abierto={selectorClienteAbierto}
        sucursalId={perfil?.sucursal_id}
        onCerrar={() => setSelectorClienteAbierto(false)}
        onElegir={(c) => {
          setCliente(c)
          setSelectorClienteAbierto(false)
        }}
      />
    </div>
  )
}
