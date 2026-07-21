import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { obtenerProductosConStock } from '../../lib/productos'
import { traducirError } from '../../lib/errores'
import SelectorUnidad from '../../components/SelectorUnidad'
import Button from '../../components/ui/Button'

export default function RegistrarPerdida() {
  const [productos, setProductos] = useState([])
  const [productoId, setProductoId] = useState('')
  const [cantidadSeleccion, setCantidadSeleccion] = useState({ unidad: 'maple', cantidad: 0, cantidad_maple: 0 })
  const [motivo, setMotivo] = useState('')

  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    obtenerProductosConStock().then(setProductos).catch((e) => setError(traducirError(e)))
  }, [])

  const productoSeleccionado = productos.find((p) => p.id === productoId)

  async function registrarPerdida() {
    if (!productoSeleccionado || cantidadSeleccion.cantidad_maple <= 0 || !motivo.trim()) return
    setEnviando(true)
    setError(null)
    setMensaje(null)
    try {
      const { error: errorRpc } = await supabase.rpc('fn_registrar_perdida', {
        p_producto_id: productoSeleccionado.id,
        p_cantidad_maple: cantidadSeleccion.cantidad_maple,
        p_motivo: motivo.trim(),
        p_unidad_transaccion: cantidadSeleccion.unidad,
        p_cantidad_unidad_transaccion: cantidadSeleccion.cantidad,
      })
      if (errorRpc) throw errorRpc
      setMensaje('Pérdida registrada.')
      setProductoId('')
      setMotivo('')
      setCantidadSeleccion({ unidad: 'maple', cantidad: 0, cantidad_maple: 0 })
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 font-display text-xl text-marca">Registrar pérdida</h1>
      <div className="flex flex-col gap-4 rounded-xl bg-white p-4 shadow-sm">
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
                {p.nombre} ({p.stock_maple} maples disponibles)
              </option>
            ))}
          </select>
        </label>

        {productoSeleccionado && <SelectorUnidad producto={productoSeleccionado} onCambio={setCantidadSeleccion} />}

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-marca">Motivo</span>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            placeholder="Ej: roturas en el traslado"
            className="rounded-lg border border-marca/20 px-3 py-2 outline-none focus:border-marca-claro"
          />
        </label>

        {error && <p className="text-sm text-perdida">{error}</p>}
        {mensaje && <p className="text-sm text-fresco">{mensaje}</p>}

        <Button
          variante="peligro"
          onClick={registrarPerdida}
          disabled={!productoSeleccionado || cantidadSeleccion.cantidad_maple <= 0 || !motivo.trim()}
          cargando={enviando}
          className="w-full"
        >
          Registrar pérdida
        </Button>
      </div>
    </div>
  )
}
