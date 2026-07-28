import { useEffect, useState } from 'react'
import { ClipboardList, Plus, Wallet } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { obtenerMovimientosCaja, crearMovimientoCajaManual } from '../../lib/caja'
import { traducirError } from '../../lib/errores'
import { formatearMoneda } from '../../lib/formato'
import { MEDIOS_PAGO } from '../../lib/constantes'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Arqueo from './Arqueo'

const MEDIOS_MOVIMIENTO = MEDIOS_PAGO.filter((m) => m.value !== 'cuenta_corriente')

// Sin `desde`, obtenerMovimientosCaja ya trae solo el día de hoy (ver
// lib/caja.js) — y con sucursalId siempre el propio de perfil, nunca deja
// ver movimientos de Central ni de otra sucursal. `refrescar` es un token
// que cambia cada vez que se registra un movimiento manual, para refetchear
// sin resetear texto/filtro (mismo patrón que BuscadorCliente).
function MovimientosHoy({ refrescar }) {
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
  }, [perfil?.sucursal_id, refrescar])

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

function ModalRegistrarMovimiento({ abierto, onCerrar, onRegistrado }) {
  const [tipo, setTipo] = useState('egreso')
  const [monto, setMonto] = useState('')
  const [concepto, setConcepto] = useState('')
  const [medio, setMedio] = useState('efectivo')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const [movimientoId, setMovimientoId] = useState(null)

  useEffect(() => {
    if (abierto) {
      setTipo('egreso')
      setMonto('')
      setConcepto('')
      setMedio('efectivo')
      setError(null)
      setMovimientoId(null)
    }
  }, [abierto])

  const puedeConfirmar = monto !== '' && Number(monto) > 0 && concepto.trim() !== ''

  async function confirmar() {
    if (!puedeConfirmar) return
    setEnviando(true)
    setError(null)
    try {
      const id = await crearMovimientoCajaManual(tipo, Number(monto), concepto.trim(), medio)
      setMovimientoId(id)
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Registrar movimiento">
      {movimientoId ? (
        <div className="flex flex-col gap-4 text-center">
          <p className="text-xl font-medium text-fresco">Movimiento registrado</p>
          <Button
            variante="secundario"
            className="min-h-[56px] w-full text-lg"
            onClick={() => window.open(`/movimiento-caja/${movimientoId}/imprimir`, '_blank')}
          >
            Imprimir comprobante
          </Button>
          <Button className="min-h-[56px] w-full text-lg" onClick={onRegistrado}>
            Cerrar
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTipo('ingreso')}
              className={`min-h-[56px] flex-1 rounded-xl border text-lg font-medium transition-colors ${
                tipo === 'ingreso' ? 'border-fresco bg-fresco/10 text-fresco' : 'border-marca/20 text-marca/60'
              }`}
            >
              Ingreso
            </button>
            <button
              type="button"
              onClick={() => setTipo('egreso')}
              className={`min-h-[56px] flex-1 rounded-xl border text-lg font-medium transition-colors ${
                tipo === 'egreso' ? 'border-perdida bg-perdida/10 text-perdida' : 'border-marca/20 text-marca/60'
              }`}
            >
              Egreso
            </button>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-marca">Monto</span>
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
            <span className="text-sm font-medium text-marca">Concepto</span>
            <input
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Ej: Compra de yerba"
              className="min-h-[56px] rounded-xl border border-marca/20 px-4 py-3 text-lg outline-none focus:border-marca-claro"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-marca">Medio de pago</span>
            <select
              value={medio}
              onChange={(e) => setMedio(e.target.value)}
              className="min-h-[56px] rounded-xl border border-marca/20 px-4 py-3 text-lg outline-none focus:border-marca-claro"
            >
              {MEDIOS_MOVIMIENTO.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>

          {error && <p className="text-sm text-perdida">{error}</p>}

          <Button
            variante="confirmar"
            className="min-h-[56px] w-full text-lg"
            disabled={!puedeConfirmar}
            cargando={enviando}
            onClick={confirmar}
          >
            Registrar
          </Button>
        </div>
      )}
    </Modal>
  )
}

// Arqueo + movimientos manuales de la caja del día, sin nada específico de
// "rendir a Central" — lo comparten CajaSucursal.jsx (que le suma Rendir
// efectivo, porque ahí sí hay una sucursal remota que le manda plata a
// Central) y CajaMostrador.jsx (que no: el cajero de mostrador YA está en
// Casa Central, no tiene a quién "rendirle" nada).
export default function PanelCajaDiaria() {
  const [tab, setTab] = useState('arqueo') // 'arqueo' | 'movimientos'
  const [modalMovimientoAbierto, setModalMovimientoAbierto] = useState(false)
  const [refrescarMovimientos, setRefrescarMovimientos] = useState(0)

  function movimientoRegistrado() {
    setModalMovimientoAbierto(false)
    setRefrescarMovimientos((n) => n + 1)
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-4">
        <button
          onClick={() => setModalMovimientoAbierto(true)}
          className="flex items-center gap-1.5 text-sm font-medium text-marca-claro"
        >
          <Plus size={16} /> Registrar movimiento
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

      {tab === 'arqueo' ? <Arqueo /> : <MovimientosHoy refrescar={refrescarMovimientos} />}

      <ModalRegistrarMovimiento
        abierto={modalMovimientoAbierto}
        onCerrar={() => setModalMovimientoAbierto(false)}
        onRegistrado={movimientoRegistrado}
      />
    </div>
  )
}
