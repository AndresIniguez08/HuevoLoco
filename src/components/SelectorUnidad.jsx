import { useEffect, useState } from 'react'
import { UNIDADES, ETIQUETA_UNIDAD } from '../lib/constantes'

// Única fuente de conversión entre maple / caja / cajón. Ningún otro
// componente debe hardcodear las equivalencias del producto.
export function convertirAMaple(cantidad, unidad, producto) {
  const cantidadNum = Number(cantidad) || 0
  if (unidad === UNIDADES.CAJA) return cantidadNum * (producto.equivalencia_caja || 0)
  if (unidad === UNIDADES.CAJON) return cantidadNum * (producto.equivalencia_cajon || 0)
  return cantidadNum
}

export function unidadesDisponibles(producto) {
  const disponibles = [UNIDADES.MAPLE]
  if (producto.admite_caja) disponibles.push(UNIDADES.CAJA)
  if (producto.equivalencia_cajon) disponibles.push(UNIDADES.CAJON)
  return disponibles
}

export default function SelectorUnidad({ producto, onCambio, valorInicial }) {
  const [unidad, setUnidad] = useState(valorInicial?.unidad || UNIDADES.MAPLE)
  const [cantidad, setCantidad] = useState(valorInicial?.cantidad ?? '')

  const opciones = unidadesDisponibles(producto)

  useEffect(() => {
    const cantidadMaple = convertirAMaple(cantidad, unidad, producto)
    onCambio?.({ unidad, cantidad: Number(cantidad) || 0, cantidad_maple: cantidadMaple })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unidad, cantidad])

  const cantidadMaple = convertirAMaple(cantidad, unidad, producto)

  return (
    <div className="flex items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-marca">Cantidad</span>
        <input
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          className="w-24 rounded-lg border border-marca/20 px-3 py-2 font-mono outline-none focus:border-marca-claro"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-marca">Unidad</span>
        <select
          value={unidad}
          onChange={(e) => setUnidad(e.target.value)}
          className="rounded-lg border border-marca/20 px-3 py-2 outline-none focus:border-marca-claro"
        >
          {opciones.map((op) => (
            <option key={op} value={op}>
              {ETIQUETA_UNIDAD[op].plural}
            </option>
          ))}
        </select>
      </label>
      {unidad !== UNIDADES.MAPLE && (
        <span className="pb-2.5 font-mono text-sm text-marca/60">
          = {cantidadMaple} {ETIQUETA_UNIDAD[UNIDADES.MAPLE].plural}
        </span>
      )}
    </div>
  )
}
