import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { actualizarCamioneta, actualizarEstadoCamioneta } from '../../lib/camionetas'
import { traducirError } from '../../lib/errores'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

const esquema = z.object({
  nombre: z.string().min(1, 'Ingresá un nombre'),
  patente: z.string().optional(),
  modelo: z.string().optional(),
})

export default function EditarCamioneta({ camioneta, onActualizado, onCancelar }) {
  const [enviando, setEnviando] = useState(false)
  const [cambiandoEstado, setCambiandoEstado] = useState(false)
  const [error, setError] = useState(null)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(esquema),
    defaultValues: {
      nombre: camioneta.nombre || '',
      patente: camioneta.patente || '',
      modelo: camioneta.modelo || '',
    },
  })

  async function onSubmit(datos) {
    setEnviando(true)
    setError(null)
    try {
      await actualizarCamioneta(camioneta.id, {
        nombre: datos.nombre,
        patente: datos.patente || null,
        modelo: datos.modelo || null,
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
      await actualizarEstadoCamioneta(camioneta.id, !camioneta.activo)
      onActualizado()
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setCambiandoEstado(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-marca">{camioneta.nombre}</h3>
        <Badge tono={camioneta.activo ? 'exito' : 'error'}>{camioneta.activo ? 'Activa' : 'Inactiva'}</Badge>
      </div>

      <Input label="Nombre" error={errors.nombre?.message} {...register('nombre')} />
      <Input label="Patente" error={errors.patente?.message} {...register('patente')} />
      <Input label="Modelo" placeholder="Ej: Fiorino, Sprinter" error={errors.modelo?.message} {...register('modelo')} />

      {error && <p className="text-sm text-perdida">{error}</p>}

      <div className="mt-2 flex gap-2">
        <Button
          type="button"
          variante={camioneta.activo ? 'peligro' : 'confirmar'}
          cargando={cambiandoEstado}
          onClick={alternarActivo}
          className="flex-1"
        >
          {camioneta.activo ? 'Desactivar' : 'Activar'}
        </Button>
        <Button type="submit" cargando={enviando} className="flex-1">
          Guardar cambios
        </Button>
      </div>
      <Button type="button" variante="fantasma" onClick={onCancelar}>
        Cerrar
      </Button>
    </form>
  )
}
