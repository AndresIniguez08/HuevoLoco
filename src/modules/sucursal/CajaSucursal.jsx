import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Send } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import {
  obtenerFondoFijoSucursal,
  obtenerSaldoEfectivoSucursal,
  crearRendicionEfectivo,
} from '../../lib/rendicionesEfectivo'
import { traducirError } from '../../lib/errores'
import { formatearMoneda } from '../../lib/formato'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import PanelCajaDiaria from '../caja/PanelCajaDiaria'

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
  const [modalRendirAbierto, setModalRendirAbierto] = useState(false)

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-fondo p-4 pb-10">
      <button onClick={() => navigate('/sucursal')} className="mb-4 flex items-center gap-2 text-lg text-marca">
        <ArrowLeft size={24} /> Volver
      </button>

      <div className="mb-4 flex flex-wrap gap-4">
        <button
          onClick={() => setModalRendirAbierto(true)}
          className="flex items-center gap-1.5 text-sm font-medium text-marca-claro"
        >
          <Send size={16} /> Rendir efectivo
        </button>
      </div>

      <PanelCajaDiaria />

      <ModalRendirEfectivo
        abierto={modalRendirAbierto}
        sucursalId={perfil?.sucursal_id}
        onCerrar={() => setModalRendirAbierto(false)}
      />
    </div>
  )
}
