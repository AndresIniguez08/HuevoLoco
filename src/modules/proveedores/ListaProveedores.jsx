import { useEffect, useState } from 'react'
import { listarProveedores, actualizarEstadoProveedor } from '../../lib/proveedores'
import { traducirError } from '../../lib/errores'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import AltaProveedor from './AltaProveedor'
import EditarProveedor from './EditarProveedor'

export default function ListaProveedores() {
  const [texto, setTexto] = useState('')
  const [incluirInactivos, setIncluirInactivos] = useState(false)
  const [proveedores, setProveedores] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [cambiandoId, setCambiandoId] = useState(null)
  const [modalAlta, setModalAlta] = useState(false)
  const [proveedorEditar, setProveedorEditar] = useState(null)

  useEffect(() => {
    const timeout = setTimeout(cargar, 250)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto, incluirInactivos])

  async function cargar() {
    setCargando(true)
    try {
      const data = await listarProveedores({ texto, incluirInactivos })
      setProveedores(data)
      setError(null)
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setCargando(false)
    }
  }

  async function alternarActivo(proveedor) {
    setCambiandoId(proveedor.id)
    setError(null)
    try {
      await actualizarEstadoProveedor(proveedor.id, !proveedor.activo)
      await cargar()
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setCambiandoId(null)
    }
  }

  function guardadoOk() {
    setModalAlta(false)
    setProveedorEditar(null)
    cargar()
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl text-marca">Proveedores</h1>
        <Button onClick={() => setModalAlta(true)}>Nuevo proveedor</Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Buscar proveedor por nombre"
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
          <p className="p-4 text-sm text-marca/60">Cargando proveedores...</p>
        ) : proveedores.length === 0 ? (
          <p className="p-4 text-sm text-marca/50">No hay proveedores para mostrar.</p>
        ) : (
          <ul className="divide-y divide-marca/10">
            {proveedores.map((p) => {
              const detalle = [
                p.contacto,
                p.telefono,
                p.plazo_pago_dias != null ? `${p.plazo_pago_dias} días de plazo` : 'Contado',
              ]
                .filter(Boolean)
                .join(' · ')
              return (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                  <div>
                    <button
                      className="text-left font-medium text-marca hover:text-marca-claro"
                      onClick={() => setProveedorEditar(p)}
                    >
                      {p.nombre}
                    </button>
                    <p className="text-marca/50">{detalle}</p>
                  </div>
                  <div className="flex items-center gap-3">
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

      <Modal abierto={modalAlta} onCerrar={() => setModalAlta(false)} titulo="Nuevo proveedor">
        <AltaProveedor onCreado={guardadoOk} onCancelar={() => setModalAlta(false)} />
      </Modal>

      <Modal abierto={!!proveedorEditar} onCerrar={() => setProveedorEditar(null)} titulo="Editar proveedor">
        {proveedorEditar && (
          <EditarProveedor
            proveedor={proveedorEditar}
            onActualizado={guardadoOk}
            onCancelar={() => setProveedorEditar(null)}
          />
        )}
      </Modal>
    </div>
  )
}
