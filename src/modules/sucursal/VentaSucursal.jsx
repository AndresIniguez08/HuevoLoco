import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Plus, Trash2 } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { obtenerProductosHabilitadosSucursal } from '../../lib/productos'
import { obtenerPreciosLista } from '../../lib/precios'
import { buscarClientes, crearCliente, obtenerClienteConsumidorFinal } from '../../lib/clientes'
import { crearVentaSucursal, completarVentaSucursal } from '../../lib/ventaSucursal'
import { traducirError } from '../../lib/errores'
import { ETIQUETA_UNIDAD, MEDIOS_PAGO } from '../../lib/constantes'
import SelectorUnidad from '../../components/SelectorUnidad'
import Button from '../../components/ui/Button'

// Mismo texto que usa fn_confirmar_pedido en Central para el bloqueo de
// cuenta corriente — acá señala que la venta quedó guardada y hace falta que
// Central autorice antes de poder cobrarla.
function necesitaAutorizacion(mensaje) {
  return /cuenta corriente autorizada|l[ií]mite autorizado/i.test(mensaje || '')
}

function lineaDePagoVacia() {
  return { id: crypto.randomUUID(), monto: '', medio: 'efectivo' }
}

export default function VentaSucursal() {
  const perfil = useAuthStore((s) => s.perfil)
  const navigate = useNavigate()

  const [paso, setPaso] = useState('venta') // 'venta' | 'buscarCliente' | 'nuevoCliente' | 'cobrar' | 'exito'

  const [cliente, setCliente] = useState(null)
  const [cargandoCliente, setCargandoCliente] = useState(true)

  const [productos, setProductos] = useState([])
  const [preciosLista, setPreciosLista] = useState({})
  const [productoId, setProductoId] = useState('')
  const [precioManual, setPrecioManual] = useState('')
  const [cantidadSeleccion, setCantidadSeleccion] = useState({ unidad: 'maple', cantidad: 0, cantidad_maple: 0 })
  const [items, setItems] = useState([])

  const [pedidoId, setPedidoId] = useState(null)
  const [lineas, setLineas] = useState([lineaDePagoVacia()])
  const [bloqueado, setBloqueado] = useState(false)

  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!perfil?.sucursal_id) return
    setCargandoCliente(true)
    Promise.all([
      obtenerClienteConsumidorFinal(perfil.sucursal_id),
      obtenerProductosHabilitadosSucursal(perfil.sucursal_id),
    ])
      .then(([c, p]) => {
        setCliente(c)
        setProductos(p)
      })
      .catch((e) => setError(traducirError(e)))
      .finally(() => setCargandoCliente(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil?.sucursal_id])

  useEffect(() => {
    if (!cliente) {
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

  useEffect(() => {
    setPrecioManual('')
  }, [productoId, cantidadSeleccion.unidad])

  function agregarAlPedido() {
    if (!productoSeleccionado || cantidadSeleccion.cantidad_maple <= 0) return
    const precioFinal = precioManual !== '' ? Number(precioManual) : precioListaProducto
    if (precioFinal == null) return
    setItems([
      ...items,
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
    setPrecioManual('')
    setCantidadSeleccion({ unidad: 'maple', cantidad: 0, cantidad_maple: 0 })
  }

  function quitarItem(id) {
    setItems(items.filter((it) => it.id !== id))
  }

  const total = items.reduce((acc, it) => acc + it.subtotal, 0)

  function empezarVentaNueva() {
    setItems([])
    setPedidoId(null)
    setLineas([lineaDePagoVacia()])
    setBloqueado(false)
    setError(null)
    setPaso('venta')
    if (perfil?.sucursal_id) {
      obtenerClienteConsumidorFinal(perfil.sucursal_id)
        .then(setCliente)
        .catch(() => {})
    }
  }

  function actualizarLinea(id, cambios) {
    setLineas((prev) => prev.map((l) => (l.id === id ? { ...l, ...cambios } : l)))
  }

  // No exige cubrir el total: igual que en Central, lo que no se cobra en el
  // momento queda como saldo en cuenta corriente del cliente (la función ya
  // rechaza esto si el cliente no tiene cuenta corriente autorizada).
  const sumaLineas = lineas.reduce((acc, l) => acc + (Number(l.monto) || 0), 0)
  const diferencia = total - sumaLineas
  const puedeCobrar = lineas.every((l) => Number(l.monto) > 0) && sumaLineas > 0 && diferencia >= -0.01

  async function confirmarCobro() {
    setEnviando(true)
    setError(null)
    try {
      let pid = pedidoId
      if (!pid) {
        pid = await crearVentaSucursal(
          cliente.id,
          items.map((it) => ({
            producto_id: it.producto_id,
            cantidad_maple: it.cantidad_maple,
            unidad_transaccion: it.unidad,
            cantidad_unidad: it.cantidad,
            precio_lista: it.precio_lista,
            precio_aplicado: it.precio_aplicado,
          }))
        )
        setPedidoId(pid)
      }
      await completarVentaSucursal(
        pid,
        lineas.map((l) => ({ monto: Number(l.monto), medio: l.medio }))
      )
      setPaso('exito')
    } catch (e) {
      const mensaje = e.message || ''
      if (necesitaAutorizacion(mensaje)) {
        setBloqueado(true)
      } else {
        setError(traducirError(e))
      }
    } finally {
      setEnviando(false)
    }
  }

  if (cargandoCliente) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-fondo">
        <p className="text-lg text-marca/60">Cargando...</p>
      </div>
    )
  }

  // --- Pantalla de éxito ---
  if (paso === 'exito') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-fondo p-4 text-center">
        <p className="text-3xl font-medium text-fresco">¡Venta cobrada!</p>
        <p className="text-lg text-marca/70">
          {cliente?.nombre} — ${total.toFixed(2)}
        </p>
        <Button variante="confirmar" className="min-h-[64px] w-full max-w-xs text-xl" onClick={empezarVentaNueva}>
          Nueva venta
        </Button>
        <button onClick={() => navigate('/sucursal')} className="text-lg text-marca">
          Volver al inicio
        </button>
      </div>
    )
  }

  // --- Bloqueado: necesita autorización de Central ---
  if (bloqueado) {
    return (
      <div className="flex min-h-screen flex-col justify-center gap-6 bg-fondo p-4">
        <p className="text-center text-2xl font-medium text-perdida">
          Esta venta necesita autorización de Casa Central.
        </p>
        <p className="text-center text-lg text-marca/70">
          Llamalos y avisales — el pedido ya quedó guardado, cuando te autoricen volvé a esta pantalla.
        </p>
        {error && <p className="text-center text-base text-perdida">{error}</p>}
        <Button
          variante="confirmar"
          className="min-h-[64px] w-full text-xl"
          cargando={enviando}
          onClick={confirmarCobro}
        >
          Reintentar cobro
        </Button>
        <button onClick={() => navigate('/sucursal')} className="text-center text-lg text-marca">
          Volver al inicio
        </button>
      </div>
    )
  }

  // --- Buscar cliente registrado ---
  if (paso === 'buscarCliente') {
    return <PasoBuscarCliente onElegir={(c) => { setCliente(c); setPaso('venta') }} onNuevo={() => setPaso('nuevoCliente')} onVolver={() => setPaso('venta')} sucursalId={perfil.sucursal_id} />
  }

  // --- Nuevo cliente ---
  if (paso === 'nuevoCliente') {
    return (
      <PasoNuevoCliente
        sucursalId={perfil.sucursal_id}
        onCreado={(c) => { setCliente(c); setPaso('venta') }}
        onVolver={() => setPaso('buscarCliente')}
      />
    )
  }

  // --- Cobrar ---
  if (paso === 'cobrar') {
    return (
      <div className="min-h-screen bg-fondo p-4 pb-10">
        <button onClick={() => setPaso('venta')} className="mb-4 flex items-center gap-2 text-lg text-marca">
          <ArrowLeft size={24} /> Volver
        </button>
        <h1 className="mb-1 font-display text-2xl text-marca">Cobrar</h1>
        <p className="mb-4 text-lg text-marca/70">{cliente?.nombre}</p>

        <div className="mb-4 rounded-2xl bg-marca p-5 text-center text-white">
          <p className="text-sm text-white/70">Total a cobrar</p>
          <p className="font-mono text-4xl leading-tight">${total.toFixed(2)}</p>
        </div>

        <div className="flex flex-col gap-3">
          {lineas.map((l, i) => (
            <div key={l.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="mb-2 text-sm font-medium text-marca">Pago {i + 1}</p>
              <div className="flex flex-col gap-3">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="Monto"
                  value={l.monto}
                  onChange={(e) => actualizarLinea(l.id, { monto: e.target.value })}
                  className="w-full rounded-xl border border-marca/20 px-4 py-3 text-xl font-mono outline-none focus:border-marca-claro"
                />
                <select
                  value={l.medio}
                  onChange={(e) => actualizarLinea(l.id, { medio: e.target.value })}
                  className="w-full rounded-xl border border-marca/20 px-4 py-3 text-lg outline-none focus:border-marca-claro"
                >
                  {MEDIOS_PAGO.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                {lineas.length > 1 && (
                  <button
                    onClick={() => setLineas((prev) => prev.filter((x) => x.id !== l.id))}
                    className="flex items-center justify-center gap-1 text-sm text-perdida"
                  >
                    <Trash2 size={16} /> Quitar este pago
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setLineas((prev) => [...prev, lineaDePagoVacia()])}
          className="mt-3 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl border border-marca/20 bg-white text-base font-medium text-marca"
        >
          <Plus size={18} /> Agregar otro medio de pago
        </button>

        {sumaLineas > 0 &&
          (diferencia > 0.01 ? (
            <p className="mt-3 text-center text-base text-marca/70">
              Van a quedar <span className="font-mono">${diferencia.toFixed(2)}</span> pendientes en cuenta corriente.
            </p>
          ) : diferencia < -0.01 ? (
            <p className="mt-3 text-center text-base text-perdida">Sobran ${(-diferencia).toFixed(2)}</p>
          ) : (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-base font-medium text-fresco">
              <Check size={18} /> Cubre el total
            </p>
          ))}
        {error && <p className="mt-3 text-center text-base text-perdida">{error}</p>}

        <Button
          variante="confirmar"
          className="mt-4 min-h-[64px] w-full text-xl"
          disabled={!puedeCobrar}
          cargando={enviando}
          onClick={confirmarCobro}
        >
          Confirmar cobro
        </Button>
      </div>
    )
  }

  // --- Pantalla principal ---
  return (
    <div className="min-h-screen bg-fondo p-4 pb-10">
      <button onClick={() => navigate('/sucursal')} className="mb-4 flex items-center gap-2 text-lg text-marca">
        <ArrowLeft size={24} /> Volver
      </button>
      <h1 className="mb-4 font-display text-2xl text-marca">Vender</h1>

      <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
        <p className="text-sm text-marca/50">Cliente</p>
        <p className="mb-3 text-2xl font-medium text-marca">{cliente?.nombre || 'Consumidor Final'}</p>
        <button
          onClick={() => setPaso('buscarCliente')}
          className="flex min-h-[60px] w-full items-center justify-center rounded-xl border border-marca-claro text-lg font-medium text-marca-claro"
        >
          Elegir cliente registrado
        </button>
      </div>

      <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
        <p className="mb-2 text-sm font-medium text-marca">Agregar producto</p>
        <select
          value={productoId}
          onChange={(e) => setProductoId(e.target.value)}
          className="w-full rounded-xl border border-marca/20 px-4 py-3 text-lg outline-none focus:border-marca-claro"
        >
          <option value="">Elegir producto...</option>
          {productos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>

        {productoSeleccionado && (
          <div className="mt-3 flex flex-col gap-3">
            <SelectorUnidad producto={productoSeleccionado} onCambio={setCantidadSeleccion} />
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-marca">
                Precio x {ETIQUETA_UNIDAD[cantidadSeleccion.unidad].singular}
              </span>
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
              className="min-h-[60px] w-full text-lg"
              onClick={agregarAlPedido}
              disabled={cantidadSeleccion.cantidad_maple <= 0 || (precioListaProducto == null && precioManual === '')}
            >
              Agregar
            </Button>
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
          <p className="mb-2 text-sm font-medium text-marca">Carrito</p>
          <ul className="divide-y divide-marca/10">
            {items.map((it) => (
              <li key={it.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-lg font-medium text-marca">{it.nombre}</p>
                  <p className="text-sm text-marca/60">
                    {it.cantidad} {ETIQUETA_UNIDAD[it.unidad].plural} · ${it.precio_aplicado} c/
                    {ETIQUETA_UNIDAD[it.unidad].singular}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-lg">${it.subtotal.toFixed(2)}</span>
                  <button onClick={() => quitarItem(it.id)} className="text-perdida">
                    <Trash2 size={20} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex justify-end border-t border-marca/10 pt-3 font-mono text-2xl text-marca">
            ${total.toFixed(2)}
          </p>
        </div>
      )}

      {error && <p className="mb-3 text-center text-base text-perdida">{error}</p>}

      <Button
        variante="confirmar"
        className="min-h-[64px] w-full text-xl"
        disabled={items.length === 0 || !cliente}
        onClick={() => setPaso('cobrar')}
      >
        Cobrar
      </Button>
    </div>
  )
}

function PasoBuscarCliente({ sucursalId, onElegir, onNuevo, onVolver }) {
  const [texto, setTexto] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setBuscando(true)
      buscarClientes(texto, { sucursalId })
        .then(setResultados)
        .catch((e) => setError(traducirError(e)))
        .finally(() => setBuscando(false))
    }, 250)
    return () => clearTimeout(timeout)
  }, [texto, sucursalId])

  return (
    <div className="min-h-screen bg-fondo p-4 pb-10">
      <button onClick={onVolver} className="mb-4 flex items-center gap-2 text-lg text-marca">
        <ArrowLeft size={24} /> Volver
      </button>
      <h1 className="mb-4 font-display text-2xl text-marca">Elegir cliente</h1>

      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Buscar por nombre"
        autoFocus
        className="mb-4 w-full rounded-xl border border-marca/20 px-4 py-3 text-lg outline-none focus:border-marca-claro"
      />

      <button
        onClick={onNuevo}
        className="mb-4 flex min-h-[60px] w-full items-center justify-center gap-2 rounded-xl bg-fresco text-lg font-medium text-white"
      >
        <Plus size={20} /> Nuevo cliente
      </button>

      {error && <p className="mb-3 text-base text-perdida">{error}</p>}
      {buscando && <p className="text-center text-marca/50">Buscando...</p>}

      <div className="flex flex-col gap-2">
        {resultados.map((c) => (
          <button
            key={c.id}
            onClick={() => onElegir(c)}
            className="min-h-[60px] w-full rounded-xl bg-white p-3 text-left text-lg font-medium text-marca shadow-sm"
          >
            {c.nombre}
          </button>
        ))}
        {!buscando && texto && resultados.length === 0 && (
          <p className="text-center text-marca/50">No se encontró ningún cliente.</p>
        )}
      </div>
    </div>
  )
}

function PasoNuevoCliente({ sucursalId, onCreado, onVolver }) {
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)

  async function guardar() {
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
      onCreado(cliente)
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="min-h-screen bg-fondo p-4 pb-10">
      <button onClick={onVolver} className="mb-4 flex items-center gap-2 text-lg text-marca">
        <ArrowLeft size={24} /> Volver
      </button>
      <h1 className="mb-4 font-display text-2xl text-marca">Nuevo cliente</h1>

      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-base font-medium text-marca">Nombre</span>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            autoFocus
            className="w-full rounded-xl border border-marca/20 px-4 py-3 text-xl outline-none focus:border-marca-claro"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-base font-medium text-marca">Teléfono (opcional)</span>
          <input
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            inputMode="tel"
            className="w-full rounded-xl border border-marca/20 px-4 py-3 text-xl outline-none focus:border-marca-claro"
          />
        </label>

        {error && <p className="text-base text-perdida">{error}</p>}

        <Button
          variante="confirmar"
          className="min-h-[64px] w-full text-xl"
          disabled={!nombre.trim()}
          cargando={enviando}
          onClick={guardar}
        >
          Guardar y elegir
        </Button>
      </div>
    </div>
  )
}
