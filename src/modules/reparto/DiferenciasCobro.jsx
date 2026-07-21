import { useEffect, useState } from 'react'
import { listarDiferenciasCobro, marcarDiferenciaRevisada } from '../../lib/diferenciasCobro'
import { autorizarExcepcionCC } from '../../lib/cobranzas'
import { formatearDiferencia } from '../../lib/caja'
import { traducirError } from '../../lib/errores'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'

function FilaDiferencia({ dif, onRevisar, revisando, onCargarExcepcion }) {
  const esperado = Number(dif.monto_esperado)
  const cobrado = Number(dif.monto_cobrado)
  const { texto, clase } = formatearDiferencia(cobrado - esperado)

  return (
    <li className="flex flex-col gap-2 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium text-marca">{dif.pedidos?.clientes?.nombre || 'Cliente'}</p>
        <span className="text-xs text-marca/50">{new Date(dif.creado_at).toLocaleDateString('es-AR')}</span>
      </div>
      <p className="text-marca/60">Chofer: {dif.chofer?.nombre || '—'}</p>
      {dif.revisado && <p className="text-marca/60">Revisado por: {dif.revisor?.nombre || '—'}</p>}
      <div className="flex flex-wrap gap-4 font-mono">
        <span className="text-marca/70">Esperado: ${esperado.toFixed(2)}</span>
        <span className="text-marca/70">Cobrado: ${cobrado.toFixed(2)}</span>
        <span className={clase}>{texto}</span>
      </div>
      {dif.motivo && <p className="text-marca/70">"{dif.motivo}"</p>}
      {!dif.revisado && (
        <div className="mt-1 flex flex-wrap gap-2">
          <Button tamano="sm" variante="confirmar" cargando={revisando} onClick={() => onRevisar(dif.id)}>
            Marcar como revisado
          </Button>
          <Button tamano="sm" variante="secundario" onClick={() => onCargarExcepcion(dif)}>
            Cargar excepción de cuenta corriente
          </Button>
        </div>
      )}
    </li>
  )
}

export default function DiferenciasCobro() {
  const [diferencias, setDiferencias] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [revisandoId, setRevisandoId] = useState(null)
  const [mostrarRevisadas, setMostrarRevisadas] = useState(false)
  const [difExcepcion, setDifExcepcion] = useState(null)

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setCargando(true)
    try {
      const data = await listarDiferenciasCobro()
      setDiferencias(data)
      setError(null)
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setCargando(false)
    }
  }

  async function revisar(id) {
    setRevisandoId(id)
    setError(null)
    try {
      await marcarDiferenciaRevisada(id)
      await cargar()
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setRevisandoId(null)
    }
  }

  const pendientes = diferencias.filter((d) => !d.revisado)
  const revisadas = diferencias.filter((d) => d.revisado)

  if (cargando) return <p className="text-marca/60">Cargando diferencias...</p>

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <h1 className="font-display text-xl text-marca">Diferencias de cobro</h1>
        {pendientes.length > 0 && <Badge tono="error">{pendientes.length} sin revisar</Badge>}
      </div>
      {error && <p className="text-sm text-perdida">{error}</p>}

      <div className="rounded-xl bg-white shadow-sm">
        <h2 className="p-4 pb-0 text-sm font-medium text-marca">Sin revisar</h2>
        {pendientes.length === 0 ? (
          <p className="p-4 text-sm text-marca/50">No hay diferencias pendientes de revisión.</p>
        ) : (
          <ul className="divide-y divide-marca/10">
            {pendientes.map((d) => (
              <FilaDiferencia
                key={d.id}
                dif={d}
                revisando={revisandoId === d.id}
                onRevisar={revisar}
                onCargarExcepcion={setDifExcepcion}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl bg-white shadow-sm">
        <button
          onClick={() => setMostrarRevisadas((v) => !v)}
          className="flex w-full items-center justify-between p-4 text-sm font-medium text-marca"
        >
          Revisadas ({revisadas.length})
          <span className="text-marca/50">{mostrarRevisadas ? 'Ocultar' : 'Mostrar'}</span>
        </button>
        {mostrarRevisadas && (
          <ul className="divide-y divide-marca/10 border-t border-marca/10">
            {revisadas.length === 0 ? (
              <p className="p-4 text-sm text-marca/50">Todavía no se revisó ninguna diferencia.</p>
            ) : (
              revisadas.map((d) => <FilaDiferencia key={d.id} dif={d} onRevisar={() => {}} onCargarExcepcion={() => {}} />)
            )}
          </ul>
        )}
      </div>

      <ModalExcepcion dif={difExcepcion} onCerrar={() => setDifExcepcion(null)} onCargada={cargar} />
    </div>
  )
}

function ModalExcepcion({ dif, onCerrar, onCargada }) {
  const [monto, setMonto] = useState('0')
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (dif) {
      setMonto(String(Number(dif.monto_esperado) - Number(dif.monto_cobrado)))
      setMotivo(dif.motivo || '')
      setError(null)
    }
  }, [dif])

  if (!dif) return null

  async function confirmar() {
    setEnviando(true)
    setError(null)
    try {
      await autorizarExcepcionCC(dif.pedido_id, Number(monto), motivo)
      onCargada()
      onCerrar()
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal abierto={!!dif} onCerrar={onCerrar} titulo="Cargar excepción de cuenta corriente">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-marca/70">Cliente: {dif.pedidos?.clientes?.nombre || 'Cliente'}</p>
        <Input label="Monto de la excepción" tipo="number" numerico min="0" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} />
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-marca">Motivo</span>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            className="rounded-lg border border-marca/20 px-3 py-2 outline-none focus:border-marca-claro"
          />
        </label>
        {error && <p className="text-sm text-perdida">{error}</p>}
        <Button onClick={confirmar} cargando={enviando} disabled={!motivo.trim()} className="w-full">
          Cargar excepción
        </Button>
      </div>
    </Modal>
  )
}
