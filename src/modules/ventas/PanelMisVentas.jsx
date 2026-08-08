import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { traducirError } from '../../lib/errores'
import { ETIQUETA_ESTADO_PEDIDO, TONO_ESTADO_PEDIDO } from '../../lib/constantes'
import { formatearMoneda, formatearHora } from '../../lib/formato'
import { useRefrescoPeriodico } from '../../hooks/useRefrescoPeriodico'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import ModalCancelarPedido from '../../components/ModalCancelarPedido'

// Compartido entre sucursal (MisVentas de encargado_sucursal) y cajero
// (MisVentas de cajero_mostrador) — mismo criterio: los propios pedidos de
// hoy (vendedor_id = usuario logueado), con la opción de anularlos. Ninguno
// de los dos roles pasa props: ambos leen perfil/usuario del store, igual
// que PanelCajaDiaria.
export default function PanelMisVentas() {
  const usuario = useAuthStore((s) => s.usuario)
  const [pedidos, setPedidos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [pedidoCancelar, setPedidoCancelar] = useState(null)

  async function cargar() {
    if (!usuario) return
    try {
      // Medianoche LOCAL convertida a instante UTC explícito — no la fecha
      // UTC de hoy. new Date().toISOString().slice(0,10) da el día en UTC,
      // que en Argentina (UTC-3) adelanta 3hs: desde las 21hs hasta
      // medianoche, "hoy" ya apuntaba al día siguiente en UTC y esta
      // consulta dejaba afuera las ventas de más temprano ese mismo día.
      const inicioHoy = new Date()
      inicioHoy.setHours(0, 0, 0, 0)
      const { data, error: errorPedidos } = await supabase
        .from('pedidos')
        .select('*, clientes(nombre)')
        .eq('vendedor_id', usuario.id)
        .gte('creado_at', inicioHoy.toISOString())
        .order('creado_at', { ascending: false })
      if (errorPedidos) throw errorPedidos
      setPedidos(data)
      setError(null)
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setCargando(false)
    }
  }

  useRefrescoPeriodico(cargar, { activo: !pedidoCancelar })

  function pedidoCancelado() {
    setPedidoCancelar(null)
    cargar()
  }

  if (cargando) return <p className="text-center text-lg text-marca/60">Cargando ventas de hoy...</p>

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-center text-base text-perdida">{error}</p>}

      {pedidos.length === 0 ? (
        <p className="rounded-2xl bg-white p-5 text-center text-lg text-marca/60 shadow-sm">
          Todavía no registraste ninguna venta hoy.
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
                <span className="text-base">{formatearHora(p.creado_at)}</span>
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
