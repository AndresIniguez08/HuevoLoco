import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { traducirError } from '../../lib/errores'
import { ETIQUETA_ESTADO_PAGO, TONO_ESTADO_PAGO } from '../../lib/constantes'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'

export default function AsignarReparto() {
  const [pedidos, setPedidos] = useState([])
  const [choferes, setChoferes] = useState([])
  const [camionetas, setCamionetas] = useState([])
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
      const hoy = new Date().toISOString().slice(0, 10)
      const [
        { data: pedidosData, error: errorPedidos },
        { data: choferesData, error: errorChoferes },
        { data: camionetasData, error: errorCamionetas },
      ] = await Promise.all([
        supabase
          .from('pedidos')
          .select('*, clientes(nombre, direccion), reparto_asignaciones(id)')
          .eq('estado', 'confirmado')
          .gte('creado_at', `${hoy}T00:00:00`)
          .order('creado_at'),
        supabase.from('perfiles').select('*').eq('rol', 'chofer'),
        supabase.from('camionetas').select('*').eq('activo', true).order('nombre'),
      ])
      if (errorPedidos) throw errorPedidos
      if (errorChoferes) throw errorChoferes
      if (errorCamionetas) throw errorCamionetas
      setPedidos((pedidosData || []).filter((p) => !p.reparto_asignaciones || p.reparto_asignaciones.length === 0))
      setChoferes(choferesData || [])
      setCamionetas(camionetasData || [])
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
    </div>
  )
}
