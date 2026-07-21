import { useEffect, useState } from 'react'
import { listarProductosGestion } from '../../lib/productos'
import { obtenerItemsListaPrecio, guardarItemsListaPrecio } from '../../lib/listasPrecio'
import { traducirError } from '../../lib/errores'
import Button from '../../components/ui/Button'

function aString(valor) {
  return valor != null ? String(valor) : ''
}

function aNumeroONull(valor) {
  return valor !== '' ? Number(valor) : null
}

export default function EditorListaPrecio({ lista, onCerrar }) {
  const [productos, setProductos] = useState([])
  const [valores, setValores] = useState({})
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const [mensaje, setMensaje] = useState(null)

  useEffect(() => {
    setCargando(true)
    Promise.all([listarProductosGestion(), obtenerItemsListaPrecio(lista.id)])
      .then(([datosProductos, datosItems]) => {
        setProductos(datosProductos)
        const itemsPorProducto = Object.fromEntries(datosItems.map((it) => [it.producto_id, it]))
        const iniciales = {}
        for (const p of datosProductos) {
          const existente = itemsPorProducto[p.id]
          iniciales[p.id] = {
            precio_maple: aString(existente?.precio_maple),
            precio_caja: aString(existente?.precio_caja),
            precio_cajon: aString(existente?.precio_cajon),
          }
        }
        setValores(iniciales)
        setError(null)
      })
      .catch((e) => setError(traducirError(e)))
      .finally(() => setCargando(false))
  }, [lista.id])

  function actualizarValor(productoId, campo, valor) {
    setValores((prev) => ({ ...prev, [productoId]: { ...prev[productoId], [campo]: valor } }))
  }

  async function guardar() {
    setGuardando(true)
    setError(null)
    setMensaje(null)
    try {
      const filas = productos.map((p) => ({
        producto_id: p.id,
        precio_maple: aNumeroONull(valores[p.id]?.precio_maple),
        precio_caja: p.admite_caja ? aNumeroONull(valores[p.id]?.precio_caja) : null,
        precio_cajon: aNumeroONull(valores[p.id]?.precio_cajon),
      }))
      await guardarItemsListaPrecio(lista.id, filas)
      setMensaje('Precios guardados.')
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg text-marca">{lista.nombre}</h2>
        <Button variante="fantasma" onClick={onCerrar}>
          Volver a listas
        </Button>
      </div>

      {cargando ? (
        <p className="text-sm text-marca/60">Cargando productos...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-marca/10 text-marca/50">
                <th className="p-3 font-medium">Producto</th>
                <th className="p-3 font-medium">Precio maple</th>
                <th className="p-3 font-medium">Precio caja</th>
                <th className="p-3 font-medium">Precio cajón</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-marca/10">
              {productos.map((p) => (
                <tr key={p.id}>
                  <td className="p-3 font-medium text-marca">{p.nombre}</td>
                  <td className="p-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={valores[p.id]?.precio_maple ?? ''}
                      onChange={(e) => actualizarValor(p.id, 'precio_maple', e.target.value)}
                      className="w-28 rounded-lg border border-marca/20 px-2 py-1 font-mono outline-none focus:border-marca-claro"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={!p.admite_caja}
                      value={p.admite_caja ? valores[p.id]?.precio_caja ?? '' : ''}
                      onChange={(e) => actualizarValor(p.id, 'precio_caja', e.target.value)}
                      className="w-28 rounded-lg border border-marca/20 px-2 py-1 font-mono outline-none focus:border-marca-claro disabled:bg-marca/5"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={valores[p.id]?.precio_cajon ?? ''}
                      onChange={(e) => actualizarValor(p.id, 'precio_cajon', e.target.value)}
                      className="w-28 rounded-lg border border-marca/20 px-2 py-1 font-mono outline-none focus:border-marca-claro"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-perdida">{error}</p>}
      {mensaje && <p className="mt-3 text-sm text-fresco">{mensaje}</p>}

      <Button className="mt-4" cargando={guardando} onClick={guardar}>
        Guardar cambios
      </Button>
    </div>
  )
}
