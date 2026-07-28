import { useEffect, useState } from 'react'
import { ETIQUETA_UNIDAD, UNIDADES } from '../lib/constantes'
import { convertirAMaple, unidadesDisponibles } from '../lib/unidades'

export default function SelectorUnidad({ producto, onCambio, valorInicial }) {
  const esHuevo = producto.es_huevo !== false
  const [unidad, setUnidad] = useState(valorInicial?.unidad || (esHuevo ? UNIDADES.MAPLE : producto.unidad_base))
  const [cantidad, setCantidad] = useState(valorInicial?.cantidad ?? '')

  const opciones = esHuevo ? unidadesDisponibles(producto) : []

  useEffect(() => {
    const cantidadNum = Number(cantidad) || 0
    // Los productos que no son huevo no tienen conversión: se venden/stockean
    // directo en su unidad_base, 1 a 1 — cantidad_maple sigue siendo el
    // nombre del campo (mismo criterio que stock_maple en la base: se
    // reutiliza como "cantidad en unidad base" genérica, no exclusiva de huevo).
    const cantidadMaple = esHuevo ? convertirAMaple(cantidad, unidad, producto) : cantidadNum
    onCambio?.({ unidad: esHuevo ? unidad : producto.unidad_base, cantidad: cantidadNum, cantidad_maple: cantidadMaple })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unidad, cantidad, esHuevo])

  if (!esHuevo) {
    const etiqueta = ETIQUETA_UNIDAD[producto.unidad_base]
    return (
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-marca">Cantidad ({etiqueta?.plural || producto.unidad_base})</span>
        <input
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          className="w-28 rounded-lg border border-marca/20 px-3 py-2 font-mono outline-none focus:border-marca-claro"
        />
      </label>
    )
  }

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
