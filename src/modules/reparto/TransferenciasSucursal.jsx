import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { obtenerProductosConStock } from '../../lib/productos'
import {
  listarSucursales,
  crearRemitoTransferencia,
  listarRemitosTransferencia,
  obtenerRemitoTransferencia,
} from '../../lib/transferencias'
import { traducirError } from '../../lib/errores'
import { ETIQUETA_UNIDAD, ETIQUETA_ESTADO_REMITO, TONO_ESTADO_REMITO, formatearCantidadItemCompra } from '../../lib/constantes'
import SelectorUnidad from '../../components/SelectorUnidad'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'

export default function TransferenciasSucursal() {
  const [sucursales, setSucursales] = useState([])
  const [productos, setProductos] = useState([])
  const [sucursalDestinoId, setSucursalDestinoId] = useState('')
  const [productoId, setProductoId] = useState('')
  const [cantidadSeleccion, setCantidadSeleccion] = useState({ unidad: 'maple', cantidad: 0, cantidad_maple: 0 })
  const [items, setItems] = useState([])
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  const [error, setError] = useState(null)

  const [remitos, setRemitos] = useState([])
  const [cargandoRemitos, setCargandoRemitos] = useState(true)
  const [remitoDetalle, setRemitoDetalle] = useState(null)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)

  useEffect(() => {
    Promise.all([listarSucursales(), obtenerProductosConStock()])
      .then(([s, p]) => {
        setSucursales(s)
        setProductos(p)
      })
      .catch((e) => setError(traducirError(e)))
    cargarRemitos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function cargarRemitos() {
    setCargandoRemitos(true)
    try {
      const data = await listarRemitosTransferencia()
      setRemitos(data)
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setCargandoRemitos(false)
    }
  }

  const productoSeleccionado = productos.find((p) => p.id === productoId)

  function agregarItem() {
    if (!productoSeleccionado || cantidadSeleccion.cantidad_maple <= 0) return
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

  async function enviarRemito() {
    if (!sucursalDestinoId || items.length === 0) return
    setEnviando(true)
    setError(null)
    setMensaje(null)
    try {
      await crearRemitoTransferencia(
        sucursalDestinoId,
        items.map((it) => ({
          producto_id: it.producto_id,
          cantidad_maple: it.cantidad_maple,
          unidad_transaccion: it.unidad,
          cantidad_unidad: it.cantidad,
        }))
      )
      setMensaje('Remito enviado.')
      setItems([])
      setSucursalDestinoId('')
      await cargarRemitos()
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setEnviando(false)
    }
  }

  async function verDetalle(remitoId) {
    setRemitoDetalle(null)
    setCargandoDetalle(true)
    setError(null)
    try {
      const data = await obtenerRemitoTransferencia(remitoId)
      setRemitoDetalle(data)
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setCargandoDetalle(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 font-display text-xl text-marca">Transferencias a sucursal</h1>

      <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-medium text-marca">Sucursal destino</h2>
        <select
          value={sucursalDestinoId}
          onChange={(e) => setSucursalDestinoId(e.target.value)}
          className="w-full rounded-lg border border-marca/20 px-3 py-2 outline-none focus:border-marca-claro"
        >
          <option value="">Elegir...</option>
          {sucursales.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </select>
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
              <Button onClick={agregarItem} disabled={cantidadSeleccion.cantidad_maple <= 0}>
                Agregar
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-medium text-marca">Productos a enviar</h2>
        {items.length === 0 ? (
          <p className="text-sm text-marca/50">Todavía no agregaste productos.</p>
        ) : (
          <ul className="divide-y divide-marca/10">
            {items.map((it) => (
              <li key={it.id} className="flex items-center justify-between py-2 text-sm">
                <p className="font-medium text-marca">{it.nombre}</p>
                <div className="flex items-center gap-3">
                  <span className="text-marca/60">
                    {it.cantidad} {ETIQUETA_UNIDAD[it.unidad].plural} ({it.cantidad_maple} maples)
                  </span>
                  <button onClick={() => quitarItem(it.id)} className="text-perdida">
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="mb-3 text-sm text-perdida">{error}</p>}
      {mensaje && <p className="mb-3 text-sm text-fresco">{mensaje}</p>}

      <Button
        onClick={enviarRemito}
        disabled={!sucursalDestinoId || items.length === 0}
        cargando={enviando}
        className="w-full"
      >
        Enviar remito
      </Button>

      <h2 className="mb-3 mt-8 font-display text-lg text-marca">Remitos enviados</h2>
      {cargandoRemitos ? (
        <p className="text-sm text-marca/60">Cargando remitos...</p>
      ) : remitos.length === 0 ? (
        <p className="text-sm text-marca/50">Todavía no se envió ningún remito.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {remitos.map((r) => (
            <li
              key={r.id}
              className="cursor-pointer rounded-xl bg-white p-4 shadow-sm hover:bg-marca/5"
              onClick={() => verDetalle(r.id)}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-marca">{r.sucursales?.nombre || '—'}</p>
                  <p className="text-xs text-marca/50">{new Date(r.creado_at).toLocaleDateString('es-AR')}</p>
                  <p className="text-xs text-marca/50">Enviado por {r.creador?.nombre || '—'}</p>
                  {r.receptor?.nombre && <p className="text-xs text-marca/50">Recibido por {r.receptor.nombre}</p>}
                </div>
                <Badge tono={TONO_ESTADO_REMITO[r.estado] || 'neutro'}>
                  {ETIQUETA_ESTADO_REMITO[r.estado] || r.estado}
                </Badge>
              </div>
              {r.estado === 'con_diferencia' && r.observacion_diferencia && (
                <p className="mt-2 rounded-lg bg-perdida/10 p-2 text-sm text-perdida">{r.observacion_diferencia}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      <Modal abierto={!!remitoDetalle || cargandoDetalle} onCerrar={() => setRemitoDetalle(null)} titulo="Detalle del remito">
        {cargandoDetalle ? (
          <p className="text-sm text-marca/60">Cargando...</p>
        ) : remitoDetalle ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-marca/70">
                Destino: <span className="font-medium text-marca">{remitoDetalle.sucursales?.nombre || '—'}</span>
              </p>
              <Badge tono={TONO_ESTADO_REMITO[remitoDetalle.estado] || 'neutro'}>
                {ETIQUETA_ESTADO_REMITO[remitoDetalle.estado] || remitoDetalle.estado}
              </Badge>
            </div>
            <p className="text-sm text-marca/70">Enviado por {remitoDetalle.creador?.nombre || '—'}</p>
            {remitoDetalle.receptor?.nombre && (
              <p className="text-sm text-marca/70">Recibido por {remitoDetalle.receptor.nombre}</p>
            )}
            <ul className="divide-y divide-marca/10 text-sm">
              {(remitoDetalle.remito_transferencia_items || []).map((it) => (
                <li key={it.id} className="py-2 text-marca">
                  {it.productos?.nombre || 'Producto'} — {formatearCantidadItemCompra(it)}
                </li>
              ))}
            </ul>
            {remitoDetalle.estado === 'con_diferencia' && remitoDetalle.observacion_diferencia && (
              <p className="rounded-lg bg-perdida/10 p-3 text-sm text-perdida">{remitoDetalle.observacion_diferencia}</p>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
