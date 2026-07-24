import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { obtenerReporteDeuda } from '../../lib/cobranzas'
import { listarSucursales } from '../../lib/transferencias'
import { traducirError } from '../../lib/errores'
import { formatearMoneda } from '../../lib/formato'
import { PERIODOS } from '../../lib/periodos'
import Button from '../../components/ui/Button'

function telefonoLimpio(telefono) {
  return (telefono || '').replace(/[\s-]/g, '')
}

function mensajeWhatsapp(cliente) {
  const texto = `Hola ${cliente.nombre}, te escribimos de Huevo Loco para recordarte que tenés un saldo pendiente de ${formatearMoneda(cliente.saldo_actual)}. ¡Gracias!`
  return `https://wa.me/${telefonoLimpio(cliente.telefono)}?text=${encodeURIComponent(texto)}`
}

function TablaClientes({ clientes, mostrarPeriodo, rutaBase }) {
  return (
    <>
      {/* Mobile: una tarjeta apilada por cliente, en vez de columnas que no entran en pantallas angostas. */}
      <ul className="flex flex-col gap-3 md:hidden">
        {clientes.map((c) => (
          <li key={c.cliente_id} className="rounded-xl bg-white p-4 shadow-sm">
            <p className="font-medium text-marca">{c.nombre}</p>
            <p className="text-xs text-marca/40">{c.sucursal_nombre || '—'}</p>
            <p className="mt-1 text-sm text-marca/70">
              <span className="text-xs text-marca/40">Saldo actual: </span>
              <span className="font-mono text-perdida">{formatearMoneda(c.saldo_actual)}</span>
            </p>
            {mostrarPeriodo && (
              <p className="text-sm text-marca/70">
                <span className="text-xs text-marca/40">Generado en el período: </span>
                <span className="font-mono text-yema">{formatearMoneda(c.deuda_generada_periodo)}</span>
              </p>
            )}
            <p className="text-sm text-marca/70">Teléfono: {c.telefono || '—'}</p>
            <div className="mt-3 flex flex-col gap-2">
              <Button
                tamano="sm"
                variante="confirmar"
                disabled={!c.telefono}
                title={!c.telefono ? 'Sin teléfono cargado' : undefined}
                onClick={() => window.open(mensajeWhatsapp(c), '_blank')}
              >
                Enviar WhatsApp
              </Button>
              <Link
                to={`/${rutaBase}/cuenta-corriente`}
                state={{ clienteId: c.cliente_id }}
                className="inline-flex items-center justify-center rounded-lg border border-marca/30 px-3 py-1.5 text-sm font-medium text-marca hover:bg-marca/5"
              >
                Ver cuenta corriente
              </Link>
            </div>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-xl bg-white shadow-sm md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-marca/10 text-marca/50">
              <th className="p-3 font-medium">Cliente</th>
              <th className="p-3 font-medium">Sucursal</th>
              <th className="p-3 font-medium">Saldo actual</th>
              {mostrarPeriodo && <th className="p-3 font-medium">Generado en el período</th>}
              <th className="p-3 font-medium">Teléfono</th>
              <th className="p-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-marca/10">
            {clientes.map((c) => (
              <tr key={c.cliente_id}>
                <td className="p-3 font-medium text-marca">{c.nombre}</td>
                <td className="p-3 text-marca/70">{c.sucursal_nombre || '—'}</td>
                <td className="p-3 font-mono text-perdida">{formatearMoneda(c.saldo_actual)}</td>
                {mostrarPeriodo && (
                  <td className="p-3 font-mono text-yema">{formatearMoneda(c.deuda_generada_periodo)}</td>
                )}
                <td className="p-3 text-marca/70">{c.telefono || '—'}</td>
                <td className="p-3">
                  <div className="flex justify-end gap-2">
                    <Button
                      tamano="sm"
                      variante="confirmar"
                      disabled={!c.telefono}
                      title={!c.telefono ? 'Sin teléfono cargado' : undefined}
                      onClick={() => window.open(mensajeWhatsapp(c), '_blank')}
                    >
                      Enviar WhatsApp
                    </Button>
                    <Link
                      to={`/${rutaBase}/cuenta-corriente`}
                      state={{ clienteId: c.cliente_id }}
                      className="inline-flex items-center justify-center rounded-lg border border-marca/30 px-3 py-1.5 text-sm font-medium text-marca hover:bg-marca/5"
                    >
                      Ver cuenta corriente
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default function ReporteDeuda() {
  const location = useLocation()
  const rutaBase = location.pathname.split('/')[1]
  const [sucursales, setSucursales] = useState([])
  const [sucursalId, setSucursalId] = useState('')
  const [periodoId, setPeriodoId] = useState('general')
  const [clientes, setClientes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const periodo = PERIODOS.find((p) => p.id === periodoId)

  useEffect(() => {
    listarSucursales()
      .then(setSucursales)
      .catch(() => {})
  }, [])

  useEffect(() => {
    setCargando(true)
    const { desde, hasta } = periodo.rango()
    obtenerReporteDeuda(sucursalId || null, desde ? desde.toISOString() : null, hasta ? hasta.toISOString() : null)
      .then(setClientes)
      .catch((e) => setError(traducirError(e)))
      .finally(() => setCargando(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sucursalId, periodoId])

  const totalAdeudado = clientes.reduce((acc, c) => acc + Number(c.saldo_actual), 0)
  const mostrarPeriodo = periodoId !== 'general'

  const grupos = useMemo(() => {
    const mapa = new Map()
    for (const c of clientes) {
      const nombre = c.sucursal_nombre || 'Sin sucursal'
      if (!mapa.has(nombre)) mapa.set(nombre, [])
      mapa.get(nombre).push(c)
    }
    return Array.from(mapa.entries()).map(([nombre, items]) => ({ nombre, items }))
  }, [clientes])

  if (error) return <p className="text-perdida">{error}</p>

  return (
    <div>
      <h1 className="mb-4 font-display text-xl text-marca">Reporte de deuda</h1>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-marca">Sucursal</span>
          <select
            value={sucursalId}
            onChange={(e) => setSucursalId(e.target.value)}
            className="rounded-lg border border-marca/20 px-3 py-2 text-sm outline-none focus:border-marca-claro"
          >
            <option value="">Todas</option>
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-wrap gap-2">
          {PERIODOS.map((p) => (
            <Button
              key={p.id}
              type="button"
              tamano="sm"
              variante={p.id === periodoId ? 'primario' : 'secundario'}
              onClick={() => setPeriodoId(p.id)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="mb-4 rounded-xl bg-marca p-4 text-white shadow-sm">
        <p className="text-xs text-white/70">Total adeudado</p>
        <p className="font-mono text-2xl">{formatearMoneda(totalAdeudado)}</p>
        <p className="mt-1 text-xs text-white/50">
          Saldo actual, sin filtrar por período — el filtro de período solo afecta la columna "Generado en el período".
        </p>
      </div>

      {cargando ? (
        <p className="text-marca/60">Cargando reporte...</p>
      ) : clientes.length === 0 ? (
        <p className="text-sm text-marca/50">Ningún cliente tiene saldo pendiente.</p>
      ) : grupos.length <= 1 ? (
        <TablaClientes clientes={clientes} mostrarPeriodo={mostrarPeriodo} rutaBase={rutaBase} />
      ) : (
        <div className="flex flex-col gap-6">
          {grupos.map((g) => (
            <div key={g.nombre}>
              <h2 className="mb-2 font-display text-base text-marca">{g.nombre}</h2>
              <TablaClientes clientes={g.items} mostrarPeriodo={mostrarPeriodo} rutaBase={rutaBase} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
