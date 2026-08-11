import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { traducirError } from '../../lib/errores'
import { ETIQUETA_ESTADO_PEDIDO, TONO_ESTADO_PEDIDO } from '../../lib/constantes'
import { formatearMoneda, formatearFecha, formatearHora } from '../../lib/formato'
import { PERIODOS } from '../../lib/periodos'
import { useRefrescoPeriodico } from '../../hooks/useRefrescoPeriodico'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import ModalCancelarPedido from '../../components/ModalCancelarPedido'

// Compartido entre sucursal (MisVentas de encargado_sucursal) y cajero
// (MisVentas de cajero_mostrador) — mismo criterio: los propios pedidos
// (vendedor_id = usuario logueado), con la opción de anularlos. Ninguno de
// los dos roles pasa props: ambos leen perfil/usuario del store, igual que
// PanelCajaDiaria.
export default function PanelMisVentas() {
  const usuario = useAuthStore((s) => s.usuario)
  const [pedidos, setPedidos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [pedidoCancelar, setPedidoCancelar] = useState(null)
  const [periodoId, setPeriodoId] = useState('hoy')

  async function cargar(periodo = periodoId) {
    if (!usuario) return
    try {
      // desde/hasta ya vienen como Date en hora LOCAL (setHours(0,0,0,0) opera
      // sobre el reloj local) — al pasarlos por toISOString() quedan como
      // instante UTC explícito. Si se usara la fecha UTC de "hoy" a secas,
      // en Argentina (UTC-3) adelantaría 3hs: desde las 21hs hasta
      // medianoche, "hoy" ya apuntaría al día siguiente en UTC y la consulta
      // dejaría afuera ventas de más temprano ese mismo día.
      const { desde, hasta } = PERIODOS.find((p) => p.id === periodo).rango()
      let query = supabase
        .from('pedidos')
        .select('*, clientes(nombre)')
        .eq('vendedor_id', usuario.id)
        .order('creado_at', { ascending: false })
      if (desde) query = query.gte('creado_at', desde.toISOString())
      if (hasta) query = query.lte('creado_at', hasta.toISOString())
      const { data, error: errorPedidos } = await query
      if (errorPedidos) throw errorPedidos
      setPedidos(data)
      setError(null)
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setCargando(false)
    }
  }

  function cambiarPeriodo(id) {
    setPeriodoId(id)
    cargar(id)
  }

  useRefrescoPeriodico(cargar, { activo: !pedidoCancelar })

  function pedidoCancelado() {
    setPedidoCancelar(null)
    cargar()
  }

  if (cargando) return <p className="text-center text-lg text-marca/60">Cargando ventas...</p>

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {PERIODOS.map((p) => (
          <Button
            key={p.id}
            type="button"
            tamano="sm"
            variante={p.id === periodoId ? 'primario' : 'secundario'}
            onClick={() => cambiarPeriodo(p.id)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {error && <p className="text-center text-base text-perdida">{error}</p>}

      {pedidos.length === 0 ? (
        <p className="rounded-2xl bg-white p-5 text-center text-lg text-marca/60 shadow-sm">
          Todavía no registraste ninguna venta en este período.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {pedidos.map((p) => (
            <li key={p.id} className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-lg font-medium text-marca">{p.clientes?.nombre || 'Cliente'}</p>
                <Badge tono={TONO_ESTADO_PEDIDO[p.estado] || 'neutro'}>
                  {ETIQUETA_ESTADO_PEDIDO[p.estado] || p.estado}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-marca/70">
                <span className="font-mono text-xl text-marca">{formatearMoneda(p.total)}</span>
                <span className="text-base">
                  {periodoId !== 'hoy' && `${formatearFecha(p.creado_at)} `}
                  {formatearHora(p.creado_at)}
                </span>
              </div>
              {p.estado !== 'cancelado' && (
                <Button
                  variante="peligro"
                  className="mt-1 min-h-[48px] w-full"
                  onClick={() => setPedidoCancelar(p)}
                >
                  Anular
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <ModalCancelarPedido pedido={pedidoCancelar} onCerrar={() => setPedidoCancelar(null)} onCancelado={pedidoCancelado} />
    </div>
  )
}
