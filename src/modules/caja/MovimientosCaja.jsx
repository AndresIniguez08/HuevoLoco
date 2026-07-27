import { useEffect, useState } from 'react'
import { crearMovimientoCajaManual, listarMovimientosManualesHoy } from '../../lib/caja'
import { traducirError } from '../../lib/errores'
import { useAuthStore } from '../../stores/authStore'
import { formatearMoneda } from '../../lib/formato'
import { MEDIOS_PAGO } from '../../lib/constantes'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'

// Cuenta corriente no es un medio real para un movimiento de caja manual
// (no hay plata física ni electrónica moviéndose) — mismo criterio que
// MEDIOS_COBRO_ENTREGA en VistaChofer.jsx.
const MEDIOS_MOVIMIENTO = MEDIOS_PAGO.filter((m) => m.value !== 'cuenta_corriente')

function ModalRegistrarMovimiento({ abierto, onCerrar, onRegistrado }) {
  const [tipo, setTipo] = useState('egreso')
  const [monto, setMonto] = useState('')
  const [concepto, setConcepto] = useState('')
  const [medio, setMedio] = useState('efectivo')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (abierto) {
      setTipo('egreso')
      setMonto('')
      setConcepto('')
      setMedio('efectivo')
      setError(null)
    }
  }, [abierto])

  const puedeConfirmar = monto !== '' && Number(monto) > 0 && concepto.trim() !== ''

  async function confirmar() {
    if (!puedeConfirmar) return
    setEnviando(true)
    setError(null)
    try {
      await crearMovimientoCajaManual(tipo, Number(monto), concepto.trim(), medio)
      onRegistrado()
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Registrar movimiento">
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTipo('ingreso')}
            className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
              tipo === 'ingreso' ? 'border-fresco bg-fresco/10 text-fresco' : 'border-marca/20 text-marca/60 hover:bg-marca/5'
            }`}
          >
            Ingreso
          </button>
          <button
            type="button"
            onClick={() => setTipo('egreso')}
            className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
              tipo === 'egreso' ? 'border-perdida bg-perdida/10 text-perdida' : 'border-marca/20 text-marca/60 hover:bg-marca/5'
            }`}
          >
            Egreso
          </button>
        </div>

        <Input
          label="Monto"
          tipo="number"
          numerico
          min="0"
          step="0.01"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
        />

        <Input
          label="Concepto"
          value={concepto}
          onChange={(e) => setConcepto(e.target.value)}
          placeholder="Ej: Compra de yerba"
        />

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-marca">Medio de pago</span>
          <select
            value={medio}
            onChange={(e) => setMedio(e.target.value)}
            className="rounded-lg border border-marca/20 px-3 py-2 outline-none focus:border-marca-claro"
          >
            {MEDIOS_MOVIMIENTO.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        {error && <p className="text-sm text-perdida">{error}</p>}

        <Button onClick={confirmar} disabled={!puedeConfirmar} cargando={enviando} className="w-full">
          Registrar
        </Button>
      </div>
    </Modal>
  )
}

export default function MovimientosCaja() {
  const perfil = useAuthStore((s) => s.perfil)
  const [movimientos, setMovimientos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [modalAbierto, setModalAbierto] = useState(false)

  useEffect(() => {
    if (!perfil?.sucursal_id) return
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil?.sucursal_id])

  function cargar() {
    setCargando(true)
    listarMovimientosManualesHoy(perfil.sucursal_id)
      .then(setMovimientos)
      .catch((e) => setError(traducirError(e)))
      .finally(() => setCargando(false))
  }

  function registrado() {
    setModalAbierto(false)
    cargar()
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl text-marca">Movimientos de caja</h1>
        <Button onClick={() => setModalAbierto(true)}>Registrar movimiento</Button>
      </div>

      {error && <p className="mb-3 text-sm text-perdida">{error}</p>}

      {cargando ? (
        <p className="text-marca/60">Cargando...</p>
      ) : movimientos.length === 0 ? (
        <p className="text-sm text-marca/50">Todavía no se cargó ningún movimiento manual hoy.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-marca/10 text-marca/50">
                <th className="px-4 py-2 font-medium">Hora</th>
                <th className="px-4 py-2 font-medium">Concepto</th>
                <th className="px-4 py-2 font-medium">Medio</th>
                <th className="px-4 py-2 font-medium">Tipo</th>
                <th className="px-4 py-2 text-right font-medium">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-marca/10">
              {movimientos.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-2 text-marca/70">
                    {new Date(m.creado_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-2">{m.descripcion}</td>
                  <td className="px-4 py-2 capitalize">{m.medio.replace('_', ' ')}</td>
                  <td className="px-4 py-2">
                    <Badge tono={m.tipo === 'egreso' ? 'error' : 'exito'}>{m.tipo === 'egreso' ? 'Egreso' : 'Ingreso'}</Badge>
                  </td>
                  <td className="px-4 py-2 text-right font-mono">{formatearMoneda(m.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ModalRegistrarMovimiento
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        onRegistrado={registrado}
      />
    </div>
  )
}
