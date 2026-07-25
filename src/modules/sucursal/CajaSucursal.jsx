import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ClipboardList, Send, Wallet } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { obtenerMovimientosCaja } from '../../lib/caja'
import {
  obtenerFondoFijoSucursal,
  obtenerSaldoEfectivoSucursal,
  crearRendicionEfectivo,
} from '../../lib/rendicionesEfectivo'
import { traducirError } from '../../lib/errores'
import { formatearMoneda } from '../../lib/formato'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
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

// fn_crear_rendicion_efectivo ya devuelve un mensaje claro cuando el monto
// declarado supera el efectivo disponible — no matchea ningún patrón de
// traducirError (que no conoce este caso puntual), así que se muestra tal
// cual en vez de perder el detalle (mismo criterio que en VentaSucursal.jsx).
function esErrorSuperaDisponible(mensaje) {
  return /supera.*(efectivo|disponible)/i.test(mensaje || '')
}

function ModalRendirEfectivo({ abierto, sucursalId, onCerrar }) {
  const [saldoEfectivo, setSaldoEfectivo] = useState(0)
  const [fondoFijo, setFondoFijo] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [monto, setMonto] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const [rendicionId, setRendicionId] = useState(null)

  useEffect(() => {
    if (!abierto) return
    setCargando(true)
    setError(null)
    setRendicionId(null)
    setObservaciones('')
    Promise.all([obtenerSaldoEfectivoSucursal(sucursalId), obtenerFondoFijoSucursal(sucursalId)])
      .then(([saldo, fondo]) => {
        setSaldoEfectivo(saldo)
        setFondoFijo(fondo)
        const disponible = saldo - fondo
        setMonto(disponible > 0 ? disponible.toFixed(2) : '')
      })
      .catch((e) => setError(traducirError(e)))
      .finally(() => setCargando(false))
  }, [abierto, sucursalId])

  const disponible = saldoEfectivo - fondoFijo

  async function confirmar() {
    setEnviando(true)
    setError(null)
    try {
      const id = await crearRendicionEfectivo(sucursalId, Number(monto), observaciones.trim() || null)
      setRendicionId(id)
    } catch (e) {
      const mensaje = e.message || ''
      setError(esErrorSuperaDisponible(mensaje) ? mensaje : traducirError(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Rendir efectivo">
      {rendicionId ? (
        <div className="flex flex-col gap-4 text-center">
          <p className="text-xl font-medium text-fresco">Rendición enviada</p>
          <p className="text-marca/70">
            Se envió {formatearMoneda(Number(monto))} a Casa Central. Cuando la reciban y confirmen, vas a poder
            verla desde acá.
          </p>
          <Button
            variante="secundario"
            className="min-h-[56px] w-full text-lg"
            onClick={() => window.open(`/rendicion/${rendicionId}/imprimir`, '_blank')}
          >
            Imprimir comprobante
          </Button>
          <Button className="min-h-[56px] w-full text-lg" onClick={onCerrar}>
            Cerrar
          </Button>
        </div>
      ) : cargando ? (
        <p className="text-marca/60">Cargando...</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl bg-marca/5 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-marca/60">Efectivo en caja</span>
              <span className="font-mono text-marca">{formatearMoneda(saldoEfectivo)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-marca/60">Fondo fijo</span>
              <span className="font-mono text-marca">{formatearMoneda(fondoFijo)}</span>
            </div>
            <div className="mt-1 flex justify-between border-t border-marca/10 pt-1 font-medium">
              <span className="text-marca">Disponible para rendir</span>
              <span className={`font-mono ${disponible > 0 ? 'text-fresco' : 'text-marca/50'}`}>
                {formatearMoneda(disponible)}
              </span>
            </div>
          </div>

          {disponible <= 0 && (
            <p className="text-sm text-marca/50">Todavía no hay excedente sobre el fondo fijo.</p>
          )}

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-marca">Monto a rendir</span>
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="min-h-[56px] rounded-xl border border-marca/20 px-4 py-3 text-xl font-mono outline-none focus:border-marca-claro"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-marca">Observaciones (opcional)</span>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
              className="rounded-xl border border-marca/20 px-4 py-3 outline-none focus:border-marca-claro"
            />
          </label>

          {error && <p className="text-sm text-perdida">{error}</p>}

          <Button
            variante="confirmar"
            className="min-h-[56px] w-full text-lg"
            disabled={!monto || Number(monto) <= 0}
            cargando={enviando}
            onClick={confirmar}
          >
            Confirmar rendición
          </Button>
        </div>
      )}
    </Modal>
  )
}

export default function CajaSucursal() {
  const perfil = useAuthStore((s) => s.perfil)
  const navigate = useNavigate()
  const [tab, setTab] = useState('arqueo') // 'arqueo' | 'movimientos'
  const [modalRendirAbierto, setModalRendirAbierto] = useState(false)

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-fondo p-4 pb-10">
      <div className="mb-4 flex items-center justify-between gap-2">
        <button onClick={() => navigate('/sucursal')} className="flex items-center gap-2 text-lg text-marca">
          <ArrowLeft size={24} /> Volver
        </button>
        <button
          onClick={() => setModalRendirAbierto(true)}
          className="flex items-center gap-1.5 text-sm font-medium text-marca-claro"
        >
          <Send size={16} /> Rendir efectivo
        </button>
      </div>

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

      <ModalRendirEfectivo
        abierto={modalRendirAbierto}
        sucursalId={perfil?.sucursal_id}
        onCerrar={() => setModalRendirAbierto(false)}
      />
    </div>
  )
}
