import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { listarAsignacionesDelDia } from '../../lib/reparto'
import { traducirError } from '../../lib/errores'
import { ETIQUETA_ESTADO_PAGO, TONO_ESTADO_PAGO } from '../../lib/constantes'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

// Agrupa las entregas ya asignadas hoy por combinación chofer + camioneta,
// para poder imprimir una hoja de ruta por cada una.
function agruparAsignaciones(asignaciones) {
  const grupos = new Map()
  for (const a of asignaciones) {
    const clave = `${a.chofer_id}|${a.camioneta_id}`
    if (!grupos.has(clave)) {
      grupos.set(clave, {
        choferId: a.chofer_id,
        camionetaId: a.camioneta_id,
        choferNombre: a.chofer?.nombre || '—',
        camioneta: a.camioneta,
        total: 0,
        entregadas: 0,
      })
    }
    const g = grupos.get(clave)
    g.total += 1
    if (a.estado === 'entregado') g.entregadas += 1
  }
  return Array.from(grupos.values())
}

export default function AsignarReparto() {
  const [pedidos, setPedidos] = useState([])
  const [choferes, setChoferes] = useState([])
  const [camionetas, setCamionetas] = useState([])
  const [asignacionesHoy, setAsignacionesHoy] = useState([])
  const [seleccion, setSeleccion] = useState({})
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [asignando, setAsignando] = useState(null)

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setCargando(true)
    try {
      const hoy = hoyISO()
      const [
        { data: pedidosData, error: errorPedidos },
        { data: choferesData, error: errorChoferes },
        { data: camionetasData, error: errorCamionetas },
        asignacionesData,
      ] = await Promise.all([
        supabase
          .from('pedidos')
          .select('*, clientes(nombre, direccion), reparto_asignaciones(id)')
          .eq('estado', 'confirmado')
          .gte('creado_at', `${hoy}T00:00:00`)
          .order('creado_at'),
        supabase.from('perfiles').select('*').eq('rol', 'chofer'),
        supabase.from('camionetas').select('*').eq('activo', true).order('nombre'),
        listarAsignacionesDelDia(),
      ])
      if (errorPedidos) throw errorPedidos
      if (errorChoferes) throw errorChoferes
      if (errorCamionetas) throw errorCamionetas
      setPedidos((pedidosData || []).filter((p) => !p.reparto_asignaciones || p.reparto_asignaciones.length === 0))
      setChoferes(choferesData || [])
      setCamionetas(camionetasData || [])
      setAsignacionesHoy(asignacionesData || [])
      setError(null)
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setCargando(false)
    }
  }

  function actualizarSeleccion(pedidoId, campo, valor) {
    setSeleccion({ ...seleccion, [pedidoId]: { ...seleccion[pedidoId], [campo]: valor } })
  }

  async function asignar(pedidoId) {
    const { chofer_id: choferId, camioneta_id: camionetaId } = seleccion[pedidoId] || {}
    if (!choferId || !camionetaId) return
    setAsignando(pedidoId)
    setError(null)
    try {
      const { error: errorInsert } = await supabase
        .from('reparto_asignaciones')
        .insert({ pedido_id: pedidoId, chofer_id: choferId, camioneta_id: camionetaId, estado: 'asignado' })
      if (errorInsert) throw errorInsert
      await cargar()
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setAsignando(null)
    }
  }

  if (cargando) return <p className="text-marca/60">Cargando pedidos...</p>

  return (
    <div>
      <h1 className="mb-4 font-display text-xl text-marca">Asignar reparto</h1>
      {error && <p className="mb-3 text-sm text-perdida">{error}</p>}
      {pedidos.length === 0 ? (
        <p className="text-sm text-marca/50">No hay pedidos confirmados sin asignar.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {pedidos.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm">
              <div>
                <p className="font-medium text-marca">{p.clientes?.nombre}</p>
                <p className="text-sm text-marca/50">{p.clientes?.direccion || 'Sin dirección cargada'}</p>
                <Badge tono={TONO_ESTADO_PAGO[p.estado_pago] || 'neutro'} className="mt-1">
                  {ETIQUETA_ESTADO_PAGO[p.estado_pago] || p.estado_pago}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={seleccion[p.id]?.camioneta_id || ''}
                  onChange={(e) => actualizarSeleccion(p.id, 'camioneta_id', e.target.value)}
                  className="rounded-lg border border-marca/20 px-3 py-2 text-sm outline-none focus:border-marca-claro"
                >
                  <option value="">Elegir camioneta...</option>
                  {camionetas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.patente ? `${c.nombre} — ${c.patente}` : c.nombre}
                    </option>
                  ))}
                </select>
                <select
                  value={seleccion[p.id]?.chofer_id || ''}
                  onChange={(e) => actualizarSeleccion(p.id, 'chofer_id', e.target.value)}
                  className="rounded-lg border border-marca/20 px-3 py-2 text-sm outline-none focus:border-marca-claro"
                >
                  <option value="">Elegir chofer...</option>
                  {choferes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
                <Button
                  tamano="sm"
                  disabled={!seleccion[p.id]?.chofer_id || !seleccion[p.id]?.camioneta_id}
                  cargando={asignando === p.id}
                  onClick={() => asignar(p.id)}
                >
                  Asignar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-3 mt-6 font-display text-lg text-marca">Repartos asignados hoy</h2>
      {asignacionesHoy.length === 0 ? (
        <p className="text-sm text-marca/50">Todavía no se asignó ningún reparto hoy.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {agruparAsignaciones(asignacionesHoy).map((g) => (
            <li
              key={`${g.choferId}|${g.camionetaId}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm"
            >
              <div>
                <p className="font-medium text-marca">{g.choferNombre}</p>
                <p className="text-sm text-marca/50">
                  {g.camioneta?.patente ? `${g.camioneta?.nombre} — ${g.camioneta.patente}` : g.camioneta?.nombre || '—'}
                </p>
                <p className="text-xs text-marca/50">
                  {g.entregadas} de {g.total} entregadas
                </p>
              </div>
              <Button
                tamano="sm"
                variante="secundario"
                onClick={() => window.open(`/hoja-ruta/${g.choferId}/${g.camionetaId}/${hoyISO()}/imprimir`, '_blank')}
              >
                Imprimir hoja de ruta
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
