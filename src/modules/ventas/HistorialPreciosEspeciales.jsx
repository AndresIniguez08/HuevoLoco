import { useEffect, useMemo, useState } from 'react'
import { listarHistorialPreciosEspeciales } from '../../lib/ventas'
import { traducirError } from '../../lib/errores'
import { formatearMoneda, formatearFecha } from '../../lib/formato'
import { PERIODOS } from '../../lib/periodos'
import Button from '../../components/ui/Button'
import BotonVolverInicio from '../../components/BotonVolverInicio'

export default function HistorialPreciosEspeciales() {
  const [historial, setHistorial] = useState([])
  const [periodoId, setPeriodoId] = useState('general')
  const [usuarioFiltro, setUsuarioFiltro] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const periodo = PERIODOS.find((p) => p.id === periodoId)

  useEffect(() => {
    setCargando(true)
    const { desde, hasta } = periodo.rango()
    listarHistorialPreciosEspeciales({ desde: desde?.toISOString(), hasta: hasta?.toISOString() })
      .then(setHistorial)
      .catch((e) => setError(traducirError(e)))
      .finally(() => setCargando(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodoId])

  // Quién lo cargó: se arma a partir de lo que ya trajo el período elegido,
  // no con una consulta aparte a perfiles (evita depender de que ese rol
  // tenga acceso a listar todos los usuarios).
  const usuariosDisponibles = useMemo(() => {
    const mapa = new Map()
    for (const it of historial) {
      if (it.aprobado_por && !mapa.has(it.aprobado_por)) mapa.set(it.aprobado_por, it.perfiles?.nombre || 'Usuario')
    }
    return Array.from(mapa.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [historial])

  const historialFiltrado = usuarioFiltro ? historial.filter((it) => it.aprobado_por === usuarioFiltro) : historial

  return (
    <div className="mx-auto max-w-2xl">
      <BotonVolverInicio />
      <h1 className="mb-1 font-display text-xl text-marca">Historial de precios especiales</h1>
      <p className="mb-4 text-sm text-marca/60">
        Todos los ítems de pedido cargados con un precio distinto al de la lista, para auditoría.
      </p>

      <div className="mb-4 flex flex-wrap items-end gap-3">
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

        {usuariosDisponibles.length > 0 && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-marca">Cargado por</span>
            <select
              value={usuarioFiltro}
              onChange={(e) => setUsuarioFiltro(e.target.value)}
              className="rounded-lg border border-marca/20 px-3 py-2 text-sm outline-none focus:border-marca-claro"
            >
              <option value="">Todos</option>
              {usuariosDisponibles.map(([id, nombre]) => (
                <option key={id} value={id}>
                  {nombre}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {error && <p className="mb-3 text-sm text-perdida">{error}</p>}

      <div className="rounded-xl bg-white shadow-sm">
        {cargando ? (
          <p className="p-4 text-sm text-marca/60">Cargando historial...</p>
        ) : historialFiltrado.length === 0 ? (
          <p className="p-4 text-sm text-marca/50">No hay precios especiales cargados en este período.</p>
        ) : (
          <ul className="divide-y divide-marca/10">
            {historialFiltrado.map((it) => {
              const tieneListaria = it.precio_lista != null
              const diferencia = tieneListaria ? Number(it.precio_aplicado) - Number(it.precio_lista) : null
              return (
                <li key={it.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                  <div>
                    <p className="font-medium text-marca">{it.productos?.nombre || 'Producto'}</p>
                    <p className="text-marca/50">{it.pedidos?.clientes?.nombre || 'Cliente'}</p>
                    <p className="text-xs text-marca/40">
                      {it.perfiles?.nombre || 'Usuario'} · {it.aprobado_at ? formatearFecha(it.aprobado_at) : '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    {tieneListaria ? (
                      <>
                        <p className="text-xs text-marca/40 line-through">{formatearMoneda(it.precio_lista)}</p>
                        <p className="font-mono text-marca">{formatearMoneda(it.precio_aplicado)}</p>
                        <p className={`font-mono text-xs ${diferencia < 0 ? 'text-perdida' : 'text-fresco'}`}>
                          {diferencia > 0 ? '+' : ''}
                          {formatearMoneda(diferencia)}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-mono text-marca">{formatearMoneda(it.precio_aplicado)}</p>
                        <p className="text-xs text-marca/40">Sin precio de lista</p>
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
