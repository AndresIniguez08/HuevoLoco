import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { traducirError } from '../../lib/errores'
import { useAuthStore } from '../../stores/authStore'
import { formatearMoneda } from '../../lib/formato'
import Button from '../../components/ui/Button'
import ModalExcepcionConfirmar from '../../components/ModalExcepcionConfirmar'

export default function AprobarPrecioEspecial() {
  const perfil = useAuthStore((s) => s.perfil)
  const [pedidosBloqueados, setPedidosBloqueados] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [pedidoExcepcion, setPedidoExcepcion] = useState(null)
  const [ultimaExcepcionId, setUltimaExcepcionId] = useState(null)

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil?.sucursal_id])

  async function cargar() {
    setCargando(true)
    try {
      // Pedidos de sucursales que quedaron bloqueados por cuenta
      // corriente/límite (estado sigue 'pendiente' porque
      // fn_completar_venta_sucursal falló después de crear el pedido) — algo
      // que solo Central decide. Los precios especiales ya no pasan por acá:
      // el backend los audita solo en el momento de cargarse (ver
      // HistorialPreciosEspeciales para la auditoría).
      const { data, error: errorBloqueados } = perfil?.sucursal_id
        ? await supabase
            .from('pedidos')
            .select('*, clientes(nombre), sucursales(nombre)')
            .eq('estado', 'pendiente')
            .neq('sucursal_id', perfil.sucursal_id)
            .order('creado_at', { ascending: false })
        : { data: [], error: null }
      if (errorBloqueados) throw errorBloqueados
      setPedidosBloqueados(data || [])
      setError(null)
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setCargando(false)
    }
  }

  function excepcionCargada(excepcionId) {
    setPedidoExcepcion(null)
    setUltimaExcepcionId(excepcionId || null)
    cargar()
  }

  if (cargando) return <p className="text-marca/60">Cargando pedidos...</p>

  return (
    <div>
      <h1 className="mb-4 font-display text-xl text-marca">Aprobaciones</h1>
      {error && <p className="mb-3 text-sm text-perdida">{error}</p>}
      {ultimaExcepcionId && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-lg bg-fresco/10 p-3 text-sm text-fresco">
          <span>Excepción cargada y pedido confirmado.</span>
          <div className="flex items-center gap-3">
            <button
              className="underline"
              onClick={() => window.open(`/excepcion/${ultimaExcepcionId}/imprimir`, '_blank')}
            >
              Imprimir autorización
            </button>
            <button onClick={() => setUltimaExcepcionId(null)} aria-label="Cerrar aviso">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <h2 className="mb-3 text-sm font-medium text-marca">Pedidos bloqueados de sucursales</h2>
      {pedidosBloqueados.length === 0 ? (
        <p className="text-sm text-marca/50">No hay pedidos de sucursal esperando autorización.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {pedidosBloqueados.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm">
              <div>
                <p className="font-medium text-marca">{p.clientes?.nombre || 'Cliente'}</p>
                <p className="text-xs text-marca/50">{p.sucursales?.nombre || 'Sucursal'}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-marca">{formatearMoneda(p.total)}</span>
                <Button tamano="sm" variante="secundario" onClick={() => setPedidoExcepcion(p)}>
                  Cargar excepción
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ModalExcepcionConfirmar pedido={pedidoExcepcion} onCerrar={() => setPedidoExcepcion(null)} onConfirmado={excepcionCargada} />
    </div>
  )
}
