import { useEffect, useState } from 'react'
import { listarUsuarios, actualizarEstadoUsuario } from '../../lib/usuarios'
import { traducirError } from '../../lib/errores'
import { ETIQUETA_ROL, ROLES } from '../../lib/constantes'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import CrearUsuario from './CrearUsuario'

export default function ListaUsuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [cambiandoId, setCambiandoId] = useState(null)
  const [modalAbierto, setModalAbierto] = useState(false)

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setCargando(true)
    try {
      const data = await listarUsuarios()
      setUsuarios(data)
      setError(null)
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setCargando(false)
    }
  }

  async function alternarActivo(usuario) {
    setCambiandoId(usuario.id)
    setError(null)
    try {
      await actualizarEstadoUsuario(usuario.id, !usuario.activo)
      await cargar()
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setCambiandoId(null)
    }
  }

  function usuarioCreado() {
    setModalAbierto(false)
    cargar()
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl text-marca">Usuarios</h1>
        <Button onClick={() => setModalAbierto(true)}>Nuevo usuario</Button>
      </div>

      {error && <p className="mb-3 text-sm text-perdida">{error}</p>}

      <div className="rounded-xl bg-white shadow-sm">
        {cargando ? (
          <p className="p-4 text-sm text-marca/60">Cargando usuarios...</p>
        ) : usuarios.length === 0 ? (
          <p className="p-4 text-sm text-marca/50">Todavía no hay usuarios creados.</p>
        ) : (
          <ul className="divide-y divide-marca/10">
            {usuarios.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                <div>
                  <p className="font-medium text-marca">{u.nombre}</p>
                  <p className="text-marca/50">
                    {ETIQUETA_ROL[u.rol] || u.rol}
                    {u.rol === ROLES.ENCARGADO_SUCURSAL && u.sucursales?.nombre && ` — ${u.sucursales.nombre}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tono={u.activo ? 'exito' : 'error'}>{u.activo ? 'Activo' : 'Inactivo'}</Badge>
                  <Button
                    tamano="sm"
                    variante={u.activo ? 'peligro' : 'confirmar'}
                    cargando={cambiandoId === u.id}
                    onClick={() => alternarActivo(u)}
                  >
                    {u.activo ? 'Desactivar' : 'Activar'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal abierto={modalAbierto} onCerrar={() => setModalAbierto(false)} titulo="Nuevo usuario">
        <CrearUsuario onCreado={usuarioCreado} onCancelar={() => setModalAbierto(false)} />
      </Modal>
    </div>
  )
}
