import { useEffect, useState } from 'react'
import { listarCategoriasProducto, actualizarEstadoCategoria } from '../../lib/categoriasProducto'
import { traducirError } from '../../lib/errores'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import AltaCategoria from './AltaCategoria'
import EditarCategoria from './EditarCategoria'

export default function GestionCategorias() {
  const [texto, setTexto] = useState('')
  const [incluirInactivas, setIncluirInactivas] = useState(false)
  const [categorias, setCategorias] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [cambiandoId, setCambiandoId] = useState(null)
  const [modalAlta, setModalAlta] = useState(false)
  const [categoriaEditar, setCategoriaEditar] = useState(null)

  useEffect(() => {
    const timeout = setTimeout(cargar, 250)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto, incluirInactivas])

  async function cargar() {
    setCargando(true)
    try {
      const data = await listarCategoriasProducto({ texto, incluirInactivas })
      setCategorias(data)
      setError(null)
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setCargando(false)
    }
  }

  async function alternarActivo(categoria) {
    setCambiandoId(categoria.id)
    setError(null)
    try {
      await actualizarEstadoCategoria(categoria.id, !categoria.activo)
      await cargar()
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setCambiandoId(null)
    }
  }

  function guardadoOk() {
    setModalAlta(false)
    setCategoriaEditar(null)
    cargar()
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl text-marca">Categorías de producto</h1>
        <Button onClick={() => setModalAlta(true)}>Nueva categoría</Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Buscar categoría por nombre"
          className="flex-1 rounded-lg border border-marca/20 px-3 py-2 outline-none focus:border-marca-claro"
        />
        <label className="flex items-center gap-2 text-sm text-marca/70">
          <input
            type="checkbox"
            className="accent-marca"
            checked={incluirInactivas}
            onChange={(e) => setIncluirInactivas(e.target.checked)}
          />
          Mostrar inactivas
        </label>
      </div>

      {error && <p className="mb-3 text-sm text-perdida">{error}</p>}

      <div className="rounded-xl bg-white shadow-sm">
        {cargando ? (
          <p className="p-4 text-sm text-marca/60">Cargando categorías...</p>
        ) : categorias.length === 0 ? (
          <p className="p-4 text-sm text-marca/50">No hay categorías para mostrar.</p>
        ) : (
          <ul className="divide-y divide-marca/10">
            {categorias.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                <button
                  className="text-left font-medium text-marca hover:text-marca-claro"
                  onClick={() => setCategoriaEditar(c)}
                >
                  {c.nombre}
                </button>
                <div className="flex items-center gap-3">
                  <Badge tono={c.activo ? 'exito' : 'error'}>{c.activo ? 'Activa' : 'Inactiva'}</Badge>
                  <Button
                    tamano="sm"
                    variante={c.activo ? 'peligro' : 'confirmar'}
                    cargando={cambiandoId === c.id}
                    onClick={() => alternarActivo(c)}
                  >
                    {c.activo ? 'Desactivar' : 'Activar'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal abierto={modalAlta} onCerrar={() => setModalAlta(false)} titulo="Nueva categoría">
        <AltaCategoria onCreado={guardadoOk} onCancelar={() => setModalAlta(false)} />
      </Modal>

      <Modal abierto={!!categoriaEditar} onCerrar={() => setCategoriaEditar(null)} titulo="Editar categoría">
        {categoriaEditar && (
          <EditarCategoria
            categoria={categoriaEditar}
            onActualizado={guardadoOk}
            onCancelar={() => setCategoriaEditar(null)}
          />
        )}
      </Modal>
    </div>
  )
}
