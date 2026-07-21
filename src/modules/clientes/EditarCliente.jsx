import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  actualizarCliente,
  actualizarEstadoCliente,
  autorizarCuentaCorriente,
  revocarCuentaCorriente,
} from '../../lib/clientes'
import { listarListasPrecio } from '../../lib/listasPrecio'
import { obtenerNombrePerfil } from '../../lib/usuarios'
import { traducirError } from '../../lib/errores'
import { TIPOS_CLIENTE, ROLES } from '../../lib/constantes'
import { useAuthStore } from '../../stores/authStore'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'

const esquema = z.object({
  nombre: z.string().min(1, 'Ingresá un nombre'),
  tipo: z.string().min(1, 'Elegí un tipo'),
  lista_precio_id: z.string().optional(),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  email: z.string().email('Ingresá un email válido').optional().or(z.literal('')),
})

export default function EditarCliente({ cliente, onActualizado, onCancelar }) {
  const perfil = useAuthStore((s) => s.perfil)
  const puedeGestionarCC = perfil?.rol === ROLES.DUENO || perfil?.rol === ROLES.ADMINISTRATIVO
  const [listasPrecio, setListasPrecio] = useState([])
  const [enviando, setEnviando] = useState(false)
  const [cambiandoEstado, setCambiandoEstado] = useState(false)
  const [error, setError] = useState(null)
  const [autorizadorNombre, setAutorizadorNombre] = useState(null)
  const [modalCCAbierto, setModalCCAbierto] = useState(false)
  const [gestionandoCC, setGestionandoCC] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(esquema),
    defaultValues: {
      nombre: cliente.nombre || '',
      tipo: cliente.tipo || 'minorista',
      lista_precio_id: cliente.lista_precio_id || '',
      telefono: cliente.telefono || '',
      direccion: cliente.direccion || '',
      email: cliente.email || '',
    },
  })

  useEffect(() => {
    listarListasPrecio().then(setListasPrecio).catch(() => {})
  }, [])

  useEffect(() => {
    setAutorizadorNombre(null)
    if (cliente.cuenta_corriente_autorizada && cliente.cc_autorizado_por) {
      obtenerNombrePerfil(cliente.cc_autorizado_por)
        .then(setAutorizadorNombre)
        .catch(() => {})
    }
  }, [cliente])

  async function onSubmit(datos) {
    setEnviando(true)
    setError(null)
    try {
      await actualizarCliente(cliente.id, {
        nombre: datos.nombre,
        tipo: datos.tipo,
        lista_precio_id: datos.lista_precio_id || null,
        telefono: datos.telefono || null,
        direccion: datos.direccion || null,
        email: datos.email || null,
      })
      onActualizado()
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setEnviando(false)
    }
  }

  async function alternarActivo() {
    setCambiandoEstado(true)
    setError(null)
    try {
      await actualizarEstadoCliente(cliente.id, !cliente.activo)
      onActualizado()
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setCambiandoEstado(false)
    }
  }

  async function revocarCC() {
    setGestionandoCC(true)
    setError(null)
    try {
      await revocarCuentaCorriente(cliente.id)
      onActualizado()
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setGestionandoCC(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-marca">{cliente.nombre}</h3>
        <Badge tono={cliente.activo ? 'exito' : 'error'}>{cliente.activo ? 'Activo' : 'Inactivo'}</Badge>
      </div>

      <Input label="Nombre" error={errors.nombre?.message} {...register('nombre')} />

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-marca">Tipo</span>
        <select
          className="rounded-lg border border-marca/20 px-3 py-2 outline-none focus:border-marca-claro"
          {...register('tipo')}
        >
          {TIPOS_CLIENTE.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-marca">Lista de precios</span>
        <select
          className="rounded-lg border border-marca/20 px-3 py-2 outline-none focus:border-marca-claro"
          {...register('lista_precio_id')}
        >
          <option value="">Sin lista asignada</option>
          {listasPrecio.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nombre}
            </option>
          ))}
        </select>
      </label>

      <Input label="Teléfono" error={errors.telefono?.message} {...register('telefono')} />
      <Input label="Dirección" error={errors.direccion?.message} {...register('direccion')} />
      <Input label="Email" tipo="email" error={errors.email?.message} {...register('email')} />

      <div className="rounded-lg border border-marca/10 p-3">
        <h4 className="mb-2 text-sm font-medium text-marca">Cuenta corriente</h4>
        {cliente.cuenta_corriente_autorizada ? (
          <div className="flex flex-col gap-1.5 text-sm">
            <p className="text-marca/70">
              Límite de crédito: <span className="font-mono text-marca">${Number(cliente.limite_credito || 0).toFixed(2)}</span>
            </p>
            <p className="text-xs text-marca/50">
              Autorizada por {autorizadorNombre || '...'}
              {cliente.cc_autorizado_at && ` el ${new Date(cliente.cc_autorizado_at).toLocaleDateString('es-AR')}`}
            </p>
            {puedeGestionarCC && (
              <Button
                type="button"
                tamano="sm"
                variante="peligro"
                cargando={gestionandoCC}
                onClick={revocarCC}
                className="mt-1 self-start"
              >
                Revocar
              </Button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Badge tono="neutro">No autorizada</Badge>
            {puedeGestionarCC && (
              <Button type="button" tamano="sm" onClick={() => setModalCCAbierto(true)}>
                Autorizar cuenta corriente
              </Button>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-perdida">{error}</p>}

      <div className="mt-2 flex gap-2">
        <Button
          type="button"
          variante={cliente.activo ? 'peligro' : 'confirmar'}
          cargando={cambiandoEstado}
          onClick={alternarActivo}
          className="flex-1"
        >
          {cliente.activo ? 'Desactivar' : 'Activar'}
        </Button>
        <Button type="submit" cargando={enviando} className="flex-1">
          Guardar cambios
        </Button>
      </div>
      <Button type="button" variante="fantasma" onClick={onCancelar}>
        Cerrar
      </Button>

      <ModalAutorizarCC
        abierto={modalCCAbierto}
        cliente={cliente}
        onCerrar={() => setModalCCAbierto(false)}
        onAutorizado={() => {
          setModalCCAbierto(false)
          onActualizado()
        }}
      />
    </form>
  )
}

function ModalAutorizarCC({ abierto, cliente, onCerrar, onAutorizado }) {
  const [limite, setLimite] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (abierto) {
      setLimite('')
      setError(null)
    }
  }, [abierto])

  async function confirmar() {
    setEnviando(true)
    setError(null)
    try {
      await autorizarCuentaCorriente(cliente.id, Number(limite))
      onAutorizado()
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Autorizar cuenta corriente">
      <div className="flex flex-col gap-3">
        <Input
          label="Límite de crédito"
          tipo="number"
          numerico
          min="0"
          step="0.01"
          value={limite}
          onChange={(e) => setLimite(e.target.value)}
        />
        {error && <p className="text-sm text-perdida">{error}</p>}
        <Button type="button" onClick={confirmar} cargando={enviando} className="w-full">
          Autorizar
        </Button>
      </div>
    </Modal>
  )
}
