import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { listarSaldosClientes, obtenerTotalCobradoUltimos30Dias, listarExcepcionesCCDelMes } from '../../lib/cobranzas'
import { traducirError } from '../../lib/errores'
import Button from '../../components/ui/Button'

const COLOR_BARRA = '#0B2D5B'

function TooltipDeuda({ active, payload }) {
  if (!active || !payload?.length) return null
  const item = payload[0].payload
  return (
    <div className="rounded-lg border border-marca/10 bg-white px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-marca">{item.nombre}</p>
      <p className="font-mono text-marca/70">${item.saldo.toFixed(2)}</p>
    </div>
  )
}

export default function InformeCobranzas() {
  const [top5, setTop5] = useState([])
  const [totalCobrado, setTotalCobrado] = useState(0)
  const [excepciones, setExcepciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([listarSaldosClientes(), obtenerTotalCobradoUltimos30Dias(), listarExcepcionesCCDelMes()])
      .then(([saldos, cobrado, excs]) => {
        setTop5(saldos.slice(0, 5).map((c) => ({ nombre: c.nombre, saldo: Number(c.saldo) })))
        setTotalCobrado(cobrado)
        setExcepciones(excs)
      })
      .catch((e) => setError(traducirError(e)))
      .finally(() => setCargando(false))
  }, [])

  if (cargando) return <p className="text-marca/60">Cargando informe...</p>
  if (error) return <p className="text-perdida">{error}</p>

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl text-marca">Informe de cobranzas</h1>
        <Button
          tamano="sm"
          variante="secundario"
          onClick={() => window.open('/cobranzas/informe/imprimir', '_blank')}
        >
          Imprimir informe
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-marca p-4 text-white shadow-sm">
          <p className="text-xs text-white/70">Total cobrado (últimos 30 días)</p>
          <p className="font-mono text-2xl">${totalCobrado.toFixed(2)}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs text-marca/50">Excepciones de cuenta corriente este mes</p>
          <p className="font-mono text-2xl text-marca">{excepciones.length}</p>
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-medium text-marca">Top 5 clientes con mayor deuda</h2>
        {top5.length === 0 ? (
          <p className="text-sm text-marca/50">Ningún cliente tiene saldo pendiente.</p>
        ) : (
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={top5} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0B2D5B1A" vertical={false} />
                <XAxis dataKey="nombre" tick={{ fontSize: 12, fill: '#0B2D5B99' }} axisLine={{ stroke: '#0B2D5B1A' }} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 12, fill: '#0B2D5B99' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip content={<TooltipDeuda />} cursor={{ fill: '#0B2D5B0D' }} />
                <Bar dataKey="saldo" fill={COLOR_BARRA} radius={[4, 4, 0, 0]} maxBarSize={56} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-medium text-marca">Excepciones cargadas este mes</h2>
        {excepciones.length === 0 ? (
          <p className="text-sm text-marca/50">No se cargó ninguna excepción este mes.</p>
        ) : (
          <ul className="divide-y divide-marca/10 text-sm">
            {excepciones.map((e) => (
              <li key={e.id} className="flex flex-col gap-1 py-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-marca">${Number(e.monto_excepcion).toFixed(2)}</span>
                  <span className="text-xs text-marca/50">{new Date(e.creado_at).toLocaleDateString('es-AR')}</span>
                </div>
                <p className="text-marca/70">{e.motivo}</p>
                <p className="text-xs text-marca/50">Autorizado por {e.perfiles?.nombre || '—'}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
