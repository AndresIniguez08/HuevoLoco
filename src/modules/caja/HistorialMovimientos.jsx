import { useEffect, useState } from 'react'
import { obtenerMovimientosCaja } from '../../lib/caja'
import { traducirError } from '../../lib/errores'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'

function haceDias(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export default function HistorialMovimientos() {
  const [desde, setDesde] = useState(haceDias(7))
  const [movimientos, setMovimientos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desde])

  function cargar() {
    setCargando(true)
    obtenerMovimientosCaja({ desde })
      .then(setMovimientos)
      .catch((e) => setError(traducirError(e)))
      .finally(() => setCargando(false))
  }

  return (
    <div>
      <h1 className="mb-4 font-display text-xl text-marca">Historial de movimientos</h1>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-marca">Desde</span>
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="rounded-lg border border-marca/20 px-3 py-2 outline-none focus:border-marca-claro"
          />
        </label>
        <Button variante="secundario" onClick={cargar}>
          Actualizar
        </Button>
      </div>

      {cargando ? (
        <p className="text-marca/60">Cargando...</p>
      ) : error ? (
        <p className="text-perdida">{error}</p>
      ) : movimientos.length === 0 ? (
        <p className="text-sm text-marca/50">No hay movimientos en ese período.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-marca/10 text-left text-marca/50">
                <th className="px-4 py-2 font-medium">Fecha</th>
                <th className="px-4 py-2 font-medium">Descripción</th>
                <th className="px-4 py-2 font-medium">Medio</th>
                <th className="px-4 py-2 font-medium">Tipo</th>
                <th className="px-4 py-2 text-right font-medium">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-marca/10">
              {movimientos.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-2 text-marca/70">{new Date(m.creado_at).toLocaleString('es-AR')}</td>
                  <td className="px-4 py-2">{m.descripcion}</td>
                  <td className="px-4 py-2 capitalize">{m.medio}</td>
                  <td className="px-4 py-2">
                    <Badge tono={m.tipo === 'egreso' ? 'error' : 'exito'}>{m.tipo === 'egreso' ? 'Egreso' : 'Ingreso'}</Badge>
                  </td>
                  <td className="px-4 py-2 text-right font-mono">${Number(m.monto).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
