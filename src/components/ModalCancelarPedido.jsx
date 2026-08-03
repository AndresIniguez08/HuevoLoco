import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { obtenerTotalesPagadosPorPedidos } from '../lib/cobranzas'
import { MEDIOS_PAGO } from '../lib/constantes'
import { formatearMoneda } from '../lib/formato'
import Button from './ui/Button'
import Modal from './ui/Modal'

// Medios de devolución: mismo listado que MEDIOS_PAGO pero sin cuenta
// corriente, que no tiene sentido como forma de devolver dinero.
const MEDIOS_DEVOLUCION = MEDIOS_PAGO.filter((m) => m.value !== 'cuenta_corriente')

// Compartido entre ListaPedidos.jsx (Central) y las pantallas "Mis ventas"
// de sucursal/cajero — cualquier fix a este flujo tiene que aplicarse acá
// una sola vez. fn_cancelar_pedido acepta cancelar en cualquier estado
// salvo cancelado (incluido entregado).
export default function ModalCancelarPedido({ pedido, onCerrar, onCancelado }) {
  const [motivo, setMotivo] = useState('')
  const [dejarSaldoAFavor, setDejarSaldoAFavor] = useState(true)
  const [medioDevolucion, setMedioDevolucion] = useState('efectivo')
  const [totalPagado, setTotalPagado] = useState(0)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (pedido) {
      setMotivo('')
      setDejarSaldoAFavor(true)
      setMedioDevolucion('efectivo')
      setError(null)
      setTotalPagado(0)
      obtenerTotalesPagadosPorPedidos([pedido.id])
        .then((totales) => setTotalPagado(totales.get(pedido.id) || 0))
        .catch(() => setTotalPagado(0))
    }
  }, [pedido])

  if (!pedido) return null

  const tienePago = totalPagado > 0

  async function confirmar() {
    setEnviando(true)
    setError(null)
    try {
      const { error: errorRpc } = await supabase.rpc('fn_cancelar_pedido', {
        p_pedido_id: pedido.id,
        p_motivo: motivo,
        p_dejar_saldo_a_favor: tienePago ? dejarSaldoAFavor : true,
        p_medio_devolucion: tienePago && !dejarSaldoAFavor ? medioDevolucion : null,
      })
      if (errorRpc) throw new Error(errorRpc.message)
      onCancelado()
    } catch (e) {
      setError(e.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal abierto={!!pedido} onCerrar={onCerrar} titulo="Cancelar pedido">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-marca/70">
          Cliente: {pedido.clientes?.nombre || 'Cliente'} — Total:{' '}
          <span className="font-mono">{formatearMoneda(pedido.total)}</span>
        </p>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-marca">Motivo</span>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            className="rounded-lg border border-marca/20 px-3 py-2 outline-none focus:border-marca-claro"
          />
        </label>

        {tienePago && (
          <div className="rounded-lg border border-marca/10 p-3">
            <p className="mb-2 text-sm text-marca/70">
              Este pedido tiene <span className="font-mono text-marca">{formatearMoneda(totalPagado)}</span> pagado.
              ¿Qué hacemos con ese dinero?
            </p>
            <div className="flex flex-col gap-2 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  className="accent-marca"
                  checked={dejarSaldoAFavor}
                  onChange={() => setDejarSaldoAFavor(true)}
                />
                Dejar como saldo a favor del cliente
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  className="accent-marca"
                  checked={!dejarSaldoAFavor}
                  onChange={() => setDejarSaldoAFavor(false)}
                />
                Devolver el dinero
              </label>
            </div>

            {!dejarSaldoAFavor && (
              <label className="mt-2 flex flex-col gap-1 text-sm">
                <span className="font-medium text-marca">Medio de devolución</span>
                <select
                  value={medioDevolucion}
                  onChange={(e) => setMedioDevolucion(e.target.value)}
                  className="rounded-lg border border-marca/20 px-3 py-2 outline-none focus:border-marca-claro"
                >
                  {MEDIOS_DEVOLUCION.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}

        {error && <p className="text-sm text-perdida">{error}</p>}

        <Button
          type="button"
          variante="peligro"
          onClick={confirmar}
          cargando={enviando}
          disabled={!motivo.trim()}
          className="w-full"
        >
          Confirmar cancelación
        </Button>
      </div>
    </Modal>
  )
}
