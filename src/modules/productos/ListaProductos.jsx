import { useEffect, useState } from 'react'
import { listarProductosGestion, actualizarEstadoProducto } from '../../lib/productos'
import { traducirError } from '../../lib/errores'
import { ETIQUETA_CATEGORIA_HUEVO } from '../../lib/constantes'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import AltaProducto from './AltaProducto'
import EditarProducto from './EditarProducto'

export default function ListaProductos() {
  const [texto, setTexto] = useState('')
  const [incluirInactivos, setIncluirInactivos] = useState(false)
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [cambiandoId, setCambiandoId] = useState(null)
  const [modalAlta, setModalAlta] = useState(false)
  const [productoEditar, setProductoEditar] = useState(null)

  useEffect(() => {
    const timeout = setTimeout(cargar, 250)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto, incluirInactivos])

  async function cargar() {
    setCargando(true)
    try {
      const data = await listarProductosGestion({ texto, incluirInactivos })
      setProductos(data)
      setError(null)
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setCargando(false)
    }
  }

  async function alternarActivo(producto) {
    setCambiandoId(producto.id)
    setError(null)
    try {
      await actualizarEstadoProducto(producto.id, !producto.activo)
      await cargar()
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setCambiandoId(null)
    }
  }

  function guardadoOk() {
    setModalAlta(false)
    setProductoEditar(null)
    cargar()
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl text-marca">Productos</h1>
        <Button onClick={() => setModalAlta(true)}>Nuevo producto</Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Buscar producto por nombre"
          className="flex-1 rounded-lg border border-marca/20 px-3 py-2 outline-none focus:border-marca-claro"
        />
        <label className="flex items-center gap-2 text-sm text-marca/70">
          <input
            type="checkbox"
            className="accent-marca"
            checked={incluirInactivos}
            onChange={(e) => setIncluirInactivos(e.target.checked)}
          />
          Mostrar inactivos
        </label>
      </div>

      {error && <p className="mb-3 text-sm text-perdida">{error}</p>}

      <div className="rounded-xl bg-white shadow-sm">
        {cargando ? (
          <p className="p-4 text-sm text-marca/60">Cargando productos...</p>
        ) : productos.length === 0 ? (
          <p className="p-4 text-sm text-marca/50">No hay productos para mostrar.</p>
        ) : (
          <ul className="divide-y divide-marca/10">
            {productos.map((p) => {
              const detalle = [
                p.admite_caja && 'admite caja',
                p.stock_minimo_maple != null && `mínimo ${p.stock_minimo_maple} maples`,
              ]
                .filter(Boolean)
                .join(' · ')
              return (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                  <div>
                    <div className="flex items-center gap-2">
                      <button
                        className="text-left font-medium text-marca hover:text-marca-claro"
                        onClick={() => setProductoEditar(p)}
                      >
                        {p.nombre}
                      </button>
                      {p.es_huevo && (
                        <Badge tono="neutro">{ETIQUETA_CATEGORIA_HUEVO[p.categoria_huevo] || 'Sin categoría'}</Badge>
                      )}
                    </div>
                    {detalle && <p className="text-marca/50">{detalle}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    {p.costo_promedio != null && (
                      <span className="font-mono text-marca/70">${Number(p.costo_promedio).toFixed(2)}</span>
                    )}
                    <Badge tono={p.activo ? 'exito' : 'error'}>{p.activo ? 'Activo' : 'Inactivo'}</Badge>
                    <Button
                      tamano="sm"
                      variante={p.activo ? 'peligro' : 'confirmar'}
                      cargando={cambiandoId === p.id}
                      onClick={() => alternarActivo(p)}
                    >
                      {p.activo ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <Modal abierto={modalAlta} onCerrar={() => setModalAlta(false)} titulo="Nuevo producto">
        <AltaProducto onCreado={guardadoOk} onCancelar={() => setModalAlta(false)} />
      </Modal>

      <Modal abierto={!!productoEditar} onCerrar={() => setProductoEditar(null)} titulo="Editar producto">
        {productoEditar && (
          <EditarProducto
            producto={productoEditar}
            onActualizado={guardadoOk}
            onCancelar={() => setProductoEditar(null)}
          />
        )}
      </Modal>
    </div>
  )
}
