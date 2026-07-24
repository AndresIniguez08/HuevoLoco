import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { listarComprasPendientes, recibirCompra, reportarDiferenciaCompra } from '../../lib/compras'
import { traducirError } from '../../lib/errores'
import { formatearCantidadItemCompra } from '../../lib/constantes'
import Button from '../../components/ui/Button'

// Mismo patrón que AceptarMercaderia.jsx (sucursal): depósito solo confirma
// cantidades, nunca ve proveedor-selector ni costo — eso ya quedó fijado
// cuando Compras creó la orden con fn_crear_compra.
export default function RecepcionCompra() {
  const [compras, setCompras] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [procesandoId, setProcesandoId] = useState(null)
  const [compraDiferencia, setCompraDiferencia] = useState(null)
  const [observacion, setObservacion] = useState('')

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setCargando(true)
    try {
      const data = await listarComprasPendientes()
      setCompras(data)
      setError(null)
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setCargando(false)
    }
  }

  async function aceptar(compraId) {
    setProcesandoId(compraId)
    setError(null)
    try {
      await recibirCompra(compraId)
      await cargar()
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setProcesandoId(null)
    }
  }

  function abrirDiferencia(compraId) {
    setCompraDiferencia(compraId)
    setObservacion('')
  }

  async function enviarDiferencia() {
    if (!observacion.trim()) return
    setProcesandoId(compraDiferencia)
    setError(null)
    try {
      await reportarDiferenciaCompra(compraDiferencia, observacion.trim())
      setCompraDiferencia(null)
      await cargar()
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setProcesandoId(null)
    }
  }

  if (compraDiferencia) {
    return (
      <div className="mx-auto max-w-2xl">
        <button
          onClick={() => setCompraDiferencia(null)}
          className="mb-4 flex items-center gap-2 text-lg text-marca"
        >
          <ArrowLeft size={24} /> Volver
        </button>

        <p className="mb-3 text-2xl font-medium text-marca">¿Qué encontraste distinto?</p>
        <textarea
          value={observacion}
          onChange={(e) => setObservacion(e.target.value)}
          rows={5}
          placeholder="Ej: faltaron 2 maples del pedido"
          className="w-full rounded-xl border border-marca/20 px-4 py-3 text-lg outline-none focus:border-marca-claro"
          autoFocus
        />
        {error && <p className="mt-3 text-base text-perdida">{error}</p>}
        <Button
          variante="confirmar"
          className="mt-4 min-h-[64px] w-full text-xl"
          disabled={!observacion.trim()}
          cargando={procesandoId === compraDiferencia}
          onClick={enviarDiferencia}
        >
          Enviar
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 font-display text-xl text-marca">Recepción de compra</h1>

      {cargando ? (
        <p className="text-center text-lg text-marca/60">Cargando...</p>
      ) : error ? (
        <p className="text-center text-lg text-perdida">{error}</p>
      ) : compras.length === 0 ? (
        <p className="text-center text-lg text-marca/50">No hay compras pendientes.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {compras.map((c) => (
            <div key={c.id} className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-xl font-medium text-marca">{c.proveedores?.nombre || 'Proveedor'}</p>
              <p className="text-base text-marca/60">{new Date(c.creado_at).toLocaleDateString('es-AR')}</p>
              <ul className="mt-2 flex flex-col gap-1">
                {(c.compra_items || []).map((it) => (
                  <li key={it.id} className="text-xl font-medium leading-snug text-marca">
                    {it.productos?.nombre || 'Producto'} — {formatearCantidadItemCompra(it)}
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex flex-col gap-3">
                <Button
                  variante="confirmar"
                  className="min-h-[64px] w-full text-xl"
                  cargando={procesandoId === c.id}
                  onClick={() => aceptar(c.id)}
                >
                  Aceptar
                </Button>
                <Button
                  variante="secundario"
                  className="min-h-[64px] w-full text-xl"
                  disabled={procesandoId === c.id}
                  onClick={() => abrirDiferencia(c.id)}
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
