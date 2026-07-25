import { useEffect, useState } from 'react'
import {
  listarRendicionesPendientes,
  listarRendicionesHistorial,
  confirmarRendicionEfectivo,
} from '../../lib/rendicionesEfectivo'
import { formatearDiferencia } from '../../lib/caja'
import { traducirError } from '../../lib/errores'
import { formatearMoneda, formatearFechaHora } from '../../lib/formato'
import { ETIQUETA_ESTADO_RENDICION, TONO_ESTADO_RENDICION } from '../../lib/constantes'
import { useRefrescoPeriodico } from '../../hooks/useRefrescoPeriodico'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'

const CUATRO_HORAS_MS = 4 * 60 * 60 * 1000

function tiempoTranscurrido(fechaISO) {
  const ms = Date.now() - new Date(fechaISO).getTime()
  const horas = Math.floor(ms / 3600000)
  const minutos = Math.floor((ms % 3600000) / 60000)
  if (horas === 0) return `Hace ${minutos} min`
  return `Hace ${horas}h ${minutos}min`
}

function FilaPendiente({ r, onConfirmar }) {
  const demorada = Date.now() - new Date(r.fecha_envio).getTime() > CUATRO_HORAS_MS
  return (
    <li className="flex flex-col gap-2 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium text-marca">{r.sucursales?.nombre || 'Sucursal'}</p>
        <div className="flex items-center gap-2">
          {demorada && <Badge tono="error">Hace más de 4hs</Badge>}
          <span className="text-xs text-marca/50">{tiempoTranscurrido(r.fecha_envio)}</span>
        </div>
      </div>
      <p className="text-marca/60">Generada por: {r.creador?.nombre || '—'}</p>
      <p className="text-xs text-marca/50">Enviada: {formatearFechaHora(r.fecha_envio)}</p>
      <p className="font-mono text-lg text-marca">{formatearMoneda(r.monto_declarado)}</p>
      {r.observaciones && <p className="text-marca/70">&quot;{r.observaciones}&quot;</p>}
      <div className="mt-1 flex flex-wrap gap-2">
        <Button tamano="sm" variante="confirmar" onClick={() => onConfirmar(r)}>
          Confirmar recepción
        </Button>
        <Button tamano="sm" variante="secundario" onClick={() => window.open(`/rendicion/${r.id}/imprimir`, '_blank')}>
          Imprimir
        </Button>
      </div>
    </li>
  )
}

function FilaHistorial({ r }) {
  const { texto, clase } = formatearDiferencia(Number(r.diferencia) || 0)
  return (
    <li className="flex flex-col gap-2 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium text-marca">{r.sucursales?.nombre || 'Sucursal'}</p>
        <Badge tono={TONO_ESTADO_RENDICION[r.estado]}>{ETIQUETA_ESTADO_RENDICION[r.estado]}</Badge>
      </div>
      <p className="text-marca/60">
        Generada por {r.creador?.nombre || '—'} · Confirmada por {r.confirmador?.nombre || '—'}
      </p>
      <div className="flex flex-wrap gap-4 font-mono">
        <span className="text-marca/70">Declarado: {formatearMoneda(r.monto_declarado)}</span>
        <span className="text-marca/70">Recibido: {formatearMoneda(r.monto_recibido)}</span>
        {Number(r.diferencia) !== 0 && <span className={clase}>{texto}</span>}
      </div>
      <p className="text-xs text-marca/50">{formatearFechaHora(r.fecha_confirmacion)}</p>
      <div className="mt-1">
        <Button tamano="sm" variante="secundario" onClick={() => window.open(`/rendicion/${r.id}/imprimir`, '_blank')}>
          Imprimir
        </Button>
      </div>
    </li>
  )
}

export default function RendicionesEfectivo() {
  const [tab, setTab] = useState('pendientes') // 'pendientes' | 'historial'
  const [pendientes, setPendientes] = useState([])
  const [historial, setHistorial] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [rendicionConfirmar, setRendicionConfirmar] = useState(null)

  useEffect(() => {
    cargar()
  }, [])

  // Refresco silencioso cada 20s + al volver a la pestaña: cualquier
  // sucursal puede mandar una rendición nueva en cualquier momento (mismo
  // criterio que AceptarMercaderia/RendicionChoferes).
  useRefrescoPeriodico(() => cargar({ silencioso: true }), { inicial: false })

  async function cargar({ silencioso = false } = {}) {
    if (!silencioso) setCargando(true)
    try {
      const [pend, hist] = await Promise.all([listarRendicionesPendientes(), listarRendicionesHistorial()])
      setPendientes(pend)
      setHistorial(hist)
      if (!silencioso) setError(null)
    } catch (e) {
      if (!silencioso) setError(traducirError(e))
    } finally {
      if (!silencioso) setCargando(false)
    }
  }

  function confirmada() {
    setRendicionConfirmar(null)
    cargar()
  }

  if (cargando) return <p className="text-marca/60">Cargando rendiciones...</p>

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h1 className="font-display text-xl text-marca">Rendiciones de efectivo</h1>
        {pendientes.length > 0 && <Badge tono="error">{pendientes.length} pendientes</Badge>}
      </div>

      {error && <p className="text-sm text-perdida">{error}</p>}

      <div className="flex gap-2">
        <Button
          tamano="sm"
          variante={tab === 'pendientes' ? 'primario' : 'secundario'}
          onClick={() => setTab('pendientes')}
        >
          Pendientes
        </Button>
        <Button tamano="sm" variante={tab === 'historial' ? 'primario' : 'secundario'} onClick={() => setTab('historial')}>
          Historial
        </Button>
      </div>

      {tab === 'pendientes' ? (
        <div className="rounded-xl bg-white shadow-sm">
          {pendientes.length === 0 ? (
            <p className="p-4 text-sm text-marca/50">No hay rendiciones pendientes.</p>
          ) : (
            <ul className="divide-y divide-marca/10">
              {pendientes.map((r) => (
                <FilaPendiente key={r.id} r={r} onConfirmar={setRendicionConfirmar} />
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-white shadow-sm">
          {historial.length === 0 ? (
            <p className="p-4 text-sm text-marca/50">Todavía no se confirmó ninguna rendición.</p>
          ) : (
            <ul className="divide-y divide-marca/10">
              {historial.map((r) => (
                <FilaHistorial key={r.id} r={r} />
              ))}
            </ul>
          )}
        </div>
      )}

      <ModalConfirmarRendicion
        rendicion={rendicionConfirmar}
        onCerrar={() => setRendicionConfirmar(null)}
        onConfirmada={confirmada}
      />
    </div>
  )
}

function ModalConfirmarRendicion({ rendicion, onCerrar, onConfirmada }) {
  const [montoRecibido, setMontoRecibido] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (rendicion) {
      setMontoRecibido(String(rendicion.monto_declarado))
      setObservaciones('')
      setError(null)
    }
  }, [rendicion])

  if (!rendicion) return null

  const diferencia = Number(montoRecibido || 0) - Number(rendicion.monto_declarado)
  const { texto, clase } = formatearDiferencia(diferencia)

  async function confirmar() {
    setEnviando(true)
    setError(null)
    try {
      await confirmarRendicionEfectivo(rendicion.id, Number(montoRecibido), observaciones.trim() || null)
      onConfirmada()
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal abierto={!!rendicion} onCerrar={onCerrar} titulo="Confirmar recepción">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-marca/70">
          Sucursal: <span className="font-medium text-marca">{rendicion.sucursales?.nombre || '—'}</span>
        </p>
        <p className="text-sm text-marca/70">
          Monto declarado: <span className="font-mono text-marca">{formatearMoneda(rendicion.monto_declarado)}</span>
        </p>

        <Input
          label="Monto recibido"
          tipo="number"
          numerico
          min="0"
          step="0.01"
          value={montoRecibido}
          onChange={(e) => setMontoRecibido(e.target.value)}
        />

        {diferencia !== 0 && montoRecibido !== '' && (
          <p className={`text-sm ${clase}`}>{texto} respecto de lo declarado — se puede confirmar igual, es solo informativo.</p>
        )}

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-marca">Observaciones (opcional)</span>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={2}
            className="rounded-lg border border-marca/20 px-3 py-2 outline-none focus:border-marca-claro"
          />
        </label>

        {error && <p className="text-sm text-perdida">{error}</p>}

        <Button onClick={confirmar} cargando={enviando} disabled={montoRecibido === ''} className="w-full">
          Confirmar recepción
        </Button>
      </div>
    </Modal>
  )
}
