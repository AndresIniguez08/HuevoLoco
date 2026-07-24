import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { listarRemitosPendientesSucursal, aceptarRemito, reportarDiferenciaRemito } from '../../lib/transferencias'
import { traducirError } from '../../lib/errores'
import { formatearCantidadItemCompra } from '../../lib/constantes'
import { useRefrescoPeriodico } from '../../hooks/useRefrescoPeriodico'
import Button from '../../components/ui/Button'

export default function AceptarMercaderia() {
  const perfil = useAuthStore((s) => s.perfil)
  const navigate = useNavigate()

  const [remitos, setRemitos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [procesandoId, setProcesandoId] = useState(null)
  const [remitoDiferencia, setRemitoDiferencia] = useState(null)
  const [observacion, setObservacion] = useState('')

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Refresco silencioso cada 30s + al volver a la pestaña: si Central manda
  // un remito nuevo mientras el encargado tiene esta pantalla abierta, tiene
  // que aparecer solo, sin recargar la página (mismo criterio que VistaChofer).
  useRefrescoPeriodico(() => cargar({ silencioso: true }), { inicial: false })

  async function cargar({ silencioso = false } = {}) {
    if (!silencioso) setCargando(true)
    try {
      const data = await listarRemitosPendientesSucursal(perfil.sucursal_id)
      setRemitos(data)
      setError(null)
    } catch (e) {
      if (!silencioso) setError(traducirError(e))
    } finally {
      if (!silencioso) setCargando(false)
    }
  }

  async function aceptar(remitoId) {
    setProcesandoId(remitoId)
    setError(null)
    try {
      await aceptarRemito(remitoId)
      await cargar()
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setProcesandoId(null)
    }
  }

  function abrirDiferencia(remitoId) {
    setRemitoDiferencia(remitoId)
    setObservacion('')
  }

  async function enviarDiferencia() {
    if (!observacion.trim()) return
    setProcesandoId(remitoDiferencia)
    setError(null)
    try {
      await reportarDiferenciaRemito(remitoDiferencia, observacion.trim())
      setRemitoDiferencia(null)
      await cargar()
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setProcesandoId(null)
    }
  }

  if (remitoDiferencia) {
    return (
      <div className="min-h-screen bg-fondo p-4">
        <button
          onClick={() => setRemitoDiferencia(null)}
          className="mb-4 flex items-center gap-2 text-lg text-marca"
        >
          <ArrowLeft size={24} /> Volver
        </button>

        <p className="mb-3 text-2xl font-medium text-marca">¿Qué encontraste distinto?</p>
        <textarea
          value={observacion}
          onChange={(e) => setObservacion(e.target.value)}
          rows={5}
          placeholder="Ej: me mandaron 2 maples de menos"
          className="w-full rounded-xl border border-marca/20 px-4 py-3 text-lg outline-none focus:border-marca-claro"
          autoFocus
        />
        {error && <p className="mt-3 text-base text-perdida">{error}</p>}
        <Button
          variante="confirmar"
          className="mt-4 min-h-[64px] w-full text-xl"
          disabled={!observacion.trim()}
          cargando={procesandoId === remitoDiferencia}
          onClick={enviarDiferencia}
        >
          Enviar
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-fondo p-4 pb-10">
      <button onClick={() => navigate('/sucursal')} className="mb-4 flex items-center gap-2 text-lg text-marca">
        <ArrowLeft size={24} /> Volver
      </button>

      <h1 className="mb-4 font-display text-2xl text-marca">Aceptar mercadería</h1>

      {cargando ? (
        <p className="text-center text-lg text-marca/60">Cargando...</p>
      ) : error ? (
        <p className="text-center text-lg text-perdida">{error}</p>
      ) : remitos.length === 0 ? (
        <p className="text-center text-lg text-marca/50">No hay remitos pendientes.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {remitos.map((r) => (
            <div key={r.id} className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-base text-marca/60">{new Date(r.creado_at).toLocaleDateString('es-AR')}</p>
              <ul className="mt-2 flex flex-col gap-1">
                {(r.remito_transferencia_items || []).map((it) => (
                  <li key={it.id} className="text-xl font-medium leading-snug text-marca">
                    {it.productos?.nombre || 'Producto'} — {formatearCantidadItemCompra(it)}
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex flex-col gap-3">
                <Button
                  variante="confirmar"
                  className="min-h-[64px] w-full text-xl"
                  cargando={procesandoId === r.id}
                  onClick={() => aceptar(r.id)}
                >
                  Aceptar
                </Button>
                <Button
                  variante="secundario"
                  className="min-h-[64px] w-full text-xl"
                  disabled={procesandoId === r.id}
                  onClick={() => abrirDiferencia(r.id)}
                >
                  Reportar diferencia
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
