import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ClipboardList, Wallet } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { obtenerMovimientosCaja } from '../../lib/caja'
import { traducirError } from '../../lib/errores'
import { formatearMoneda } from '../../lib/formato'
import Badge from '../../components/ui/Badge'
import Arqueo from '../caja/Arqueo'

// Sin `desde`, obtenerMovimientosCaja ya trae solo el día de hoy (ver
// lib/caja.js) — y con sucursalId siempre el propio de perfil, nunca deja
// ver movimientos de Central ni de otra sucursal.
function MovimientosHoy() {
  const perfil = useAuthStore((s) => s.perfil)
  const [movimientos, setMovimientos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!perfil?.sucursal_id) return
    obtenerMovimientosCaja({ sucursalId: perfil.sucursal_id })
      .then(setMovimientos)
      .catch((e) => setError(traducirError(e)))
      .finally(() => setCargando(false))
  }, [perfil?.sucursal_id])

  if (cargando) return <p className="text-center text-lg text-marca/60">Cargando movimientos...</p>
  if (error) return <p className="text-center text-lg text-perdida">{error}</p>
  if (movimientos.length === 0) {
    return <p className="text-center text-lg text-marca/50">Todavía no hay movimientos de caja hoy.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {movimientos.map((m) => (
        <div key={m.id} className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-lg font-medium text-marca">{m.descripcion}</p>
              <p className="text-sm capitalize text-marca/50">
                {new Date(m.creado_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} ·{' '}
                {m.medio.replace('_', ' ')}
              </p>
            </div>
            <Badge tono={m.tipo === 'egreso' ? 'error' : 'exito'}>{m.tipo === 'egreso' ? 'Egreso' : 'Ingreso'}</Badge>
          </div>
          <p className={`mt-2 font-mono text-xl ${m.tipo === 'egreso' ? 'text-perdida' : 'text-fresco'}`}>
            {m.tipo === 'egreso' ? '-' : '+'}
            {formatearMoneda(m.monto)}
          </p>
        </div>
      ))}
    </div>
  )
}

export default function CajaSucursal() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('arqueo') // 'arqueo' | 'movimientos'

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-fondo p-4 pb-10">
      <button onClick={() => navigate('/sucursal')} className="mb-4 flex items-center gap-2 text-lg text-marca">
        <ArrowLeft size={24} /> Volver
      </button>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setTab('arqueo')}
          className={`flex min-h-[56px] flex-1 items-center justify-center gap-2 rounded-xl text-base font-medium ${
            tab === 'arqueo' ? 'bg-marca text-white' : 'border border-marca/20 bg-white text-marca'
          }`}
        >
          <Wallet size={20} /> Arqueo
        </button>
        <button
          onClick={() => setTab('movimientos')}
          className={`flex min-h-[56px] flex-1 items-center justify-center gap-2 rounded-xl text-base font-medium ${
            tab === 'movimientos' ? 'bg-marca text-white' : 'border border-marca/20 bg-white text-marca'
          }`}
        >
          <ClipboardList size={20} /> Movimientos de hoy
        </button>
      </div>

      {tab === 'arqueo' ? <Arqueo /> : <MovimientosHoy />}
    </div>
  )
}
