import { useEffect, useState } from 'react'
import { obtenerMovimientosCaja, totalesPorMedio } from '../../lib/caja'
import { traducirError } from '../../lib/errores'
import { MEDIOS_PAGO } from '../../lib/constantes'
import Badge from '../../components/ui/Badge'

export default function CajaDiaria() {
  const [movimientos, setMovimientos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    obtenerMovimientosCaja()
      .then(setMovimientos)
      .catch((e) => setError(traducirError(e)))
      .finally(() => setCargando(false))
  }, [])

  if (cargando) return <p className="text-marca/60">Cargando caja...</p>
  if (error) return <p className="text-perdida">{error}</p>

  const totales = totalesPorMedio(movimientos)
  const totalDia = Object.values(totales).reduce((a, b) => a + b, 0)

  return (
    <div>
      <h1 className="mb-4 font-display text-xl text-marca">Caja de hoy</h1>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {MEDIOS_PAGO.map((m) => (
          <div key={m.value} className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs text-marca/50">{m.label}</p>
            <p className="font-mono text-lg text-marca">${(totales[m.value] || 0).toFixed(2)}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 rounded-xl bg-marca p-4 text-white shadow-sm">
        <p className="text-xs text-white/70">Total del día</p>
        <p className="font-mono text-2xl">${totalDia.toFixed(2)}</p>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-medium text-marca">Movimientos</h2>
        {movimientos.length === 0 ? (
          <p className="text-sm text-marca/50">Todavía no hay movimientos hoy.</p>
        ) : (
          <ul className="divide-y divide-marca/10 text-sm">
            {movimientos.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-marca">{m.concepto || m.medio}</p>
                  <p className="text-xs text-marca/50">{new Date(m.creado_at).toLocaleTimeString('es-AR')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tono={m.tipo === 'egreso' ? 'error' : 'exito'}>{m.tipo === 'egreso' ? 'Egreso' : 'Ingreso'}</Badge>
                  <span className="font-mono">${Number(m.monto).toFixed(2)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
