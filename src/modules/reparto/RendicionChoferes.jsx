import { useEffect, useMemo, useState } from 'react'
import {
  listarChoferes,
  listarRendicionesDeHoy,
  listarRendicionesCerradas,
  crearRendicionChofer,
  cerrarRendicionChofer,
} from '../../lib/rendicionesChofer'
import { formatearDiferencia } from '../../lib/caja'
import { traducirError } from '../../lib/errores'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function RendicionChoferes() {
  const [choferes, setChoferes] = useState([])
  const [rendicionesHoy, setRendicionesHoy] = useState([])
  const [historial, setHistorial] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [iniciandoId, setIniciandoId] = useState(null)
  const [cerrandoId, setCerrandoId] = useState(null)
  const [montosCierre, setMontosCierre] = useState({})

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setCargando(true)
    try {
      const [choferesData, hoyData, historialData] = await Promise.all([
        listarChoferes(),
        listarRendicionesDeHoy(),
        listarRendicionesCerradas(),
      ])
      setChoferes(choferesData)
      setRendicionesHoy(hoyData)
      setHistorial(historialData)
      setError(null)
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setCargando(false)
    }
  }

  const rendicionPorChofer = useMemo(() => {
    const mapa = new Map()
    for (const r of rendicionesHoy) mapa.set(r.chofer_id, r)
    return mapa
  }, [rendicionesHoy])

  async function iniciar(choferId) {
    setIniciandoId(choferId)
    setError(null)
    try {
      await crearRendicionChofer(choferId)
      await cargar()
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setIniciandoId(null)
    }
  }

  async function cerrar(rendicionId) {
    setCerrandoId(rendicionId)
    setError(null)
    try {
      const monto = Number(montosCierre[rendicionId] || 0)
      await cerrarRendicionChofer(rendicionId, monto)
      await cargar()
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setCerrandoId(null)
    }
  }

  if (cargando) return <p className="text-marca/60">Cargando rendiciones...</p>

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-xl text-marca">Rendición de choferes</h1>
      {error && <p className="text-sm text-perdida">{error}</p>}

      {choferes.length === 0 ? (
        <p className="text-sm text-marca/50">No hay choferes activos.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {choferes.map((ch) => {
            const rendicion = rendicionPorChofer.get(ch.id)
            const cerrada = rendicion && rendicion.monto_entregado != null
            const montoInput = montosCierre[rendicion?.id] ?? ''
            const diferenciaPreview =
              rendicion && !cerrada && montoInput !== '' ? formatearDiferencia(Number(montoInput) - Number(rendicion.monto_esperado)) : null

            return (
              <div key={ch.id} className="rounded-xl bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-marca">{ch.nombre}</p>
                  {rendicion && (
                    <Badge tono={cerrada ? 'exito' : 'neutro'}>{cerrada ? 'Cerrada' : 'Abierta'}</Badge>
                  )}
                </div>

                {!rendicion && (
                  <Button
                    tamano="sm"
                    className="mt-3"
                    cargando={iniciandoId === ch.id}
                    onClick={() => iniciar(ch.id)}
                  >
                    Iniciar rendición de hoy
                  </Button>
                )}

                {rendicion && !cerrada && (
                  <div className="mt-3 flex flex-col gap-2">
                    <p className="text-sm text-marca/70">
                      Monto esperado:{' '}
                      <span className="font-mono text-marca">${Number(rendicion.monto_esperado).toFixed(2)}</span>
                    </p>
                    <Input
                      label="Monto que entregó"
                      tipo="number"
                      numerico
                      min="0"
                      step="0.01"
                      value={montoInput}
                      onChange={(e) => setMontosCierre({ ...montosCierre, [rendicion.id]: e.target.value })}
                    />
                    {diferenciaPreview && <p className={`text-sm ${diferenciaPreview.clase}`}>{diferenciaPreview.texto}</p>}
                    <Button
                      variante="confirmar"
                      cargando={cerrandoId === rendicion.id}
                      onClick={() => cerrar(rendicion.id)}
                    >
                      Cerrar rendición
                    </Button>
                  </div>
                )}

                {cerrada && (
                  <p className="mt-2 text-sm text-marca/50">
                    Entregó ${Number(rendicion.monto_entregado).toFixed(2)} de ${Number(rendicion.monto_esperado).toFixed(2)} esperados.
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="rounded-xl bg-white shadow-sm">
        <h2 className="p-4 pb-0 text-sm font-medium text-marca">Historial de rendiciones</h2>
        {historial.length === 0 ? (
          <p className="p-4 text-sm text-marca/50">Todavía no se cerró ninguna rendición.</p>
        ) : (
          <ul className="divide-y divide-marca/10">
            {historial.map((r) => {
              const { texto, clase } = formatearDiferencia(Number(r.monto_entregado) - Number(r.monto_esperado))
              return (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                  <div>
                    <p className="font-medium text-marca">{r.chofer?.nombre || 'Chofer'}</p>
                    <p className="text-marca/50">{new Date(r.creado_at).toLocaleDateString('es-AR')}</p>
                    <p className="text-xs text-marca/40">Recibió: {r.receptor?.nombre || '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-marca">
                      ${Number(r.monto_entregado).toFixed(2)} / ${Number(r.monto_esperado).toFixed(2)}
                    </p>
                    <p className={clase}>{texto}</p>
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
