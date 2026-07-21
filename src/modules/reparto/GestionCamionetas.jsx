import { useEffect, useState } from 'react'
import { listarCamionetas, actualizarEstadoCamioneta } from '../../lib/camionetas'
import { traducirError } from '../../lib/errores'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import AltaCamioneta from './AltaCamioneta'
import EditarCamioneta from './EditarCamioneta'

export default function GestionCamionetas() {
  const [texto, setTexto] = useState('')
  const [incluirInactivos, setIncluirInactivos] = useState(false)
  const [camionetas, setCamionetas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [cambiandoId, setCambiandoId] = useState(null)
  const [modalAlta, setModalAlta] = useState(false)
  const [camionetaEditar, setCamionetaEditar] = useState(null)

  useEffect(() => {
    const timeout = setTimeout(cargar, 250)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto, incluirInactivos])

  async function cargar() {
    setCargando(true)
    try {
      const data = await listarCamionetas({ texto, incluirInactivos })
      setCamionetas(data)
      setError(null)
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setCargando(false)
    }
  }

  async function alternarActivo(camioneta) {
    setCambiandoId(camioneta.id)
    setError(null)
    try {
      await actualizarEstadoCamioneta(camioneta.id, !camioneta.activo)
      await cargar()
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setCambiandoId(null)
    }
  }

  function guardadoOk() {
    setModalAlta(false)
    setCamionetaEditar(null)
    cargar()
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl text-marca">Camionetas</h1>
        <Button onClick={() => setModalAlta(true)}>Nueva camioneta</Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Buscar camioneta por nombre"
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
          <p className="p-4 text-sm text-marca/60">Cargando camionetas...</p>
        ) : camionetas.length === 0 ? (
          <p className="p-4 text-sm text-marca/50">No hay camionetas para mostrar.</p>
        ) : (
          <ul className="divide-y divide-marca/10">
            {camionetas.map((c) => {
              const detalle = [c.patente, c.modelo].filter(Boolean).join(' · ')
              return (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                  <div>
                    <button
                      className="text-left font-medium text-marca hover:text-marca-claro"
                      onClick={() => setCamionetaEditar(c)}
                    >
                      {c.nombre}
                    </button>
                    <p className="text-marca/50">{detalle || 'Sin datos adicionales'}</p>
                  </div>
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
              )
            })}
          </ul>
        )}
      </div>

      <Modal abierto={modalAlta} onCerrar={() => setModalAlta(false)} titulo="Nueva camioneta">
        <AltaCamioneta onCreado={guardadoOk} onCancelar={() => setModalAlta(false)} />
      </Modal>

      <Modal abierto={!!camionetaEditar} onCerrar={() => setCamionetaEditar(null)} titulo="Editar camioneta">
        {camionetaEditar && (
          <EditarCamioneta
            camioneta={camionetaEditar}
            onActualizado={guardadoOk}
            onCancelar={() => setCamionetaEditar(null)}
          />
        )}
      </Modal>
    </div>
  )
}
