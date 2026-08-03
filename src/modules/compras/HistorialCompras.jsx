import { useEffect, useState } from 'react'
import { listarHistorialCompras, anularCompra } from '../../lib/compras'
import { traducirError } from '../../lib/errores'
import { ETIQUETA_ESTADO_COMPRA, TONO_ESTADO_COMPRA, formatearCantidadItemCompra } from '../../lib/constantes'
import { formatearFecha, formatearMoneda } from '../../lib/formato'
import { useRefrescoPeriodico } from '../../hooks/useRefrescoPeriodico'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import BotonVolverInicio from '../../components/BotonVolverInicio'

function totalCompra(compra) {
  return (compra.compra_items || []).reduce(
    (acc, it) => acc + (Number(it.costo_unitario) || 0) * Number(it.cantidad_maple),
    0
  )
}

// Exclusivo de dueño. Complementa a CargarCostoCompra (que solo lista
// pendientes de costeo, y de las que desaparece una compra en cuanto se
// costea): acá se ve el historial completo — recibida/costeada/anulada — y
// se puede anular cualquiera que no lo esté ya, tenga o no costo cargado.
export default function HistorialCompras() {
  const [compras, setCompras] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [compraAnular, setCompraAnular] = useState(null)

  useRefrescoPeriodico(
    async () => {
      try {
        const data = await listarHistorialCompras()
        setCompras(data)
        setError(null)
      } catch (e) {
        setError(traducirError(e))
      } finally {
        setCargando(false)
      }
    },
    { activo: !compraAnular }
  )

  function recargar() {
    setCargando(true)
    listarHistorialCompras()
      .then(setCompras)
      .catch((e) => setError(traducirError(e)))
      .finally(() => setCargando(false))
  }

  function anulada() {
    setCompraAnular(null)
    recargar()
  }

  return (
    <div className="mx-auto max-w-2xl">
      <BotonVolverInicio />
      <h1 className="mb-1 font-display text-xl text-marca">Historial de compras</h1>
      <p className="mb-4 text-sm text-marca/60">Últimas compras registradas, con la opción de anularlas.</p>

      {error && <p className="mb-3 text-sm text-perdida">{error}</p>}

      <div className="rounded-xl bg-white shadow-sm">
        {cargando ? (
          <p className="p-4 text-sm text-marca/60">Cargando...</p>
        ) : compras.length === 0 ? (
          <p className="p-4 text-sm text-marca/50">Todavía no hay compras registradas.</p>
        ) : (
          <ul className="divide-y divide-marca/10">
            {compras.map((c) => {
              const total = totalCompra(c)
              return (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-marca">{c.proveedores?.nombre || 'Proveedor'}</p>
                      <Badge tono={TONO_ESTADO_COMPRA[c.estado] || 'neutro'}>
                        {ETIQUETA_ESTADO_COMPRA[c.estado] || c.estado}
                      </Badge>
                    </div>
                    <p className="text-marca/50">{formatearFecha(c.creado_at)}</p>
                    <ul className="mt-1 text-marca/60">
                      {(c.compra_items || []).map((it) => (
                        <li key={it.id}>
                          {it.productos?.nombre || 'Producto'} — {formatearCantidadItemCompra(it)}
                        </li>
                      ))}
                    </ul>
                    {total > 0 && <p className="mt-1 font-mono text-marca/70">Total: {formatearMoneda(total)}</p>}
                  </div>
                  {c.estado !== 'anulada' && (
                    <Button tamano="sm" variante="peligro" onClick={() => setCompraAnular(c)}>
                      Anular compra
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <ModalAnularCompra compra={compraAnular} onCerrar={() => setCompraAnular(null)} onAnulada={anulada} />
    </div>
  )
}

function ModalAnularCompra({ compra, onCerrar, onAnulada }) {
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (compra) {
      setMotivo('')
      setError(null)
    }
  }, [compra])

  if (!compra) return null

  async function confirmar() {
    setEnviando(true)
    setError(null)
    try {
      await anularCompra(compra.id, motivo)
      onAnulada()
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal abierto={!!compra} onCerrar={onCerrar} titulo="Anular compra">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-marca/70">Proveedor: {compra.proveedores?.nombre || 'Proveedor'}</p>
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
        <Button
          type="button"
          variante="peligro"
          onClick={confirmar}
          cargando={enviando}
          disabled={!motivo.trim()}
          className="w-full"
        >
          Confirmar anulación
        </Button>
      </div>
    </Modal>
  )
}
