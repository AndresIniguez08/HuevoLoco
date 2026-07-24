import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { listarDisponibilidadSucursal, actualizarDisponibilidadSucursal } from '../../lib/productos'
import { actualizarPermiteVentaSinStock } from '../../lib/transferencias'
import { traducirError } from '../../lib/errores'

function clave(productoId, sucursalId) {
  return `${productoId}:${sucursalId}`
}

function InterruptorVentaSinStock({ sucursal, guardando, onCambiar }) {
  const activo = !!sucursal.permite_venta_sin_stock
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl bg-white p-4 shadow-sm">
      <div>
        <p className="font-medium text-marca">
          {sucursal.nombre}: Permitir vender sin stock suficiente
        </p>
        <p className="mt-1 text-xs text-marca/50">
          Si está activado, se puede cobrar un pedido aunque no haya stock disponible en el momento (por ejemplo, venta
          con seña que el cliente retira más tarde). Si está apagado, el sistema bloquea la venta si falta stock.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={activo}
        disabled={guardando}
        onClick={() => onCambiar(sucursal.id, activo)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
          activo ? 'bg-fresco' : 'bg-marca/20'
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            activo ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}

export default function DisponibilidadSucursal() {
  const [productos, setProductos] = useState([])
  const [sucursales, setSucursales] = useState([])
  const [disponibilidad, setDisponibilidad] = useState({})
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [guardadosRecientes, setGuardadosRecientes] = useState({})
  const [guardandoToggleId, setGuardandoToggleId] = useState(null)

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setCargando(true)
    try {
      const { productos: p, sucursales: s, filas } = await listarDisponibilidadSucursal()
      setProductos(p)
      setSucursales(s)
      const mapa = {}
      for (const f of filas) {
        mapa[clave(f.producto_id, f.sucursal_id)] = f.habilitado
      }
      setDisponibilidad(mapa)
      setError(null)
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setCargando(false)
    }
  }

  async function alternar(productoId, sucursalId, valorActual) {
    const llave = clave(productoId, sucursalId)
    const nuevoValor = !valorActual
    setDisponibilidad((prev) => ({ ...prev, [llave]: nuevoValor }))
    setError(null)
    try {
      await actualizarDisponibilidadSucursal(productoId, sucursalId, nuevoValor)
      setGuardadosRecientes((prev) => ({ ...prev, [llave]: true }))
      setTimeout(() => {
        setGuardadosRecientes((prev) => {
          const siguiente = { ...prev }
          delete siguiente[llave]
          return siguiente
        })
      }, 1500)
    } catch (e) {
      setDisponibilidad((prev) => ({ ...prev, [llave]: valorActual }))
      setError(traducirError(e))
    }
  }

  async function alternarVentaSinStock(sucursalId, valorActual) {
    const nuevoValor = !valorActual
    setSucursales((prev) =>
      prev.map((s) => (s.id === sucursalId ? { ...s, permite_venta_sin_stock: nuevoValor } : s))
    )
    setGuardandoToggleId(sucursalId)
    setError(null)
    try {
      await actualizarPermiteVentaSinStock(sucursalId, nuevoValor)
    } catch (e) {
      setSucursales((prev) =>
        prev.map((s) => (s.id === sucursalId ? { ...s, permite_venta_sin_stock: valorActual } : s))
      )
      setError(traducirError(e))
    } finally {
      setGuardandoToggleId(null)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 font-display text-xl text-marca">Disponibilidad por sucursal</h1>
      <p className="mb-4 text-sm text-marca/60">
        Tildá qué productos vende cada sucursal. Casa Central no aparece acá: vende todo el catálogo activo por defecto.
      </p>

      {error && <p className="mb-3 text-sm text-perdida">{error}</p>}

      {!cargando && sucursales.length > 0 && (
        <div className="mb-6 flex flex-col gap-3">
          {sucursales.map((s) => (
            <InterruptorVentaSinStock
              key={s.id}
              sucursal={s}
              guardando={guardandoToggleId === s.id}
              onCambiar={alternarVentaSinStock}
            />
          ))}
        </div>
      )}

      {cargando ? (
        <p className="text-sm text-marca/60">Cargando...</p>
      ) : sucursales.length === 0 ? (
        <p className="text-sm text-marca/50">No hay sucursales cargadas (aparte de Casa Central).</p>
      ) : productos.length === 0 ? (
        <p className="text-sm text-marca/50">No hay productos activos.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-marca/10 text-marca/50">
                <th className="p-3 font-medium">Producto</th>
                {sucursales.map((s) => (
                  <th key={s.id} className="p-3 text-center font-medium">
                    {s.nombre}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-marca/10">
              {productos.map((p) => (
                <tr key={p.id}>
                  <td className="p-3 font-medium text-marca">{p.nombre}</td>
                  {sucursales.map((s) => {
                    const llave = clave(p.id, s.id)
                    const habilitado = disponibilidad[llave] || false
                    return (
                      <td key={s.id} className="p-3">
                        <div className="flex flex-col items-center gap-1">
                          <input
                            type="checkbox"
                            className="h-5 w-5 accent-marca"
                            checked={habilitado}
                            onChange={() => alternar(p.id, s.id, habilitado)}
                          />
                          <span
                            className={`flex h-4 items-center gap-1 text-xs text-fresco transition-opacity ${
                              guardadosRecientes[llave] ? 'opacity-100' : 'opacity-0'
                            }`}
                          >
                            <Check size={12} /> Guardado
                          </span>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
