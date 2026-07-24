import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { autorizarExcepcionCC } from '../lib/cobranzas'
import Button from './ui/Button'
import Modal from './ui/Modal'

// Compartido entre ListaPedidos.jsx (Central) y AprobarPrecioEspecial.jsx
// (cola unificada de pedidos bloqueados de cualquier sucursal) — no
// duplicar: cualquier fix a este flujo tiene que aplicarse acá una sola vez.
export default function ModalExcepcionConfirmar({ pedido, onCerrar, onConfirmado }) {
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (pedido) {
      setMotivo('')
      setError(null)
    }
  }, [pedido])

  if (!pedido) return null

  // Autoriza la excepción y reintenta la confirmación en la misma acción —
  // si las dos RPC salen bien, el modal se cierra solo (onConfirmado) en vez
  // de esperar un click extra en un cartel de "Excepción cargada" separado.
  async function confirmar() {
    setEnviando(true)
    setError(null)
    try {
      const id = await autorizarExcepcionCC(pedido.id, Number(pedido.total), motivo)
      const { error: errorRpc } = await supabase.rpc('fn_confirmar_pedido', { p_pedido_id: pedido.id })
      if (errorRpc) throw new Error(errorRpc.message)
      onConfirmado(id)
    } catch (e) {
      setError(e.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal abierto={!!pedido} onCerrar={onCerrar} titulo="Cargar excepción y confirmar">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-marca/70">
          Cliente: {pedido.clientes?.nombre || 'Cliente'} — Total:{' '}
          <span className="font-mono">${Number(pedido.total).toFixed(2)}</span>
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
        {error && <p className="text-sm text-perdida">{error}</p>}
        <Button type="button" onClick={confirmar} cargando={enviando} disabled={!motivo.trim()} className="w-full">
          Confirmar excepción y confirmar pedido
        </Button>
      </div>
    </Modal>
  )
}
