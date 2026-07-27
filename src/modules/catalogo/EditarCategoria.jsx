import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { actualizarCategoriaProducto, actualizarEstadoCategoria } from '../../lib/categoriasProducto'
import { traducirError } from '../../lib/errores'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

const esquema = z.object({
  nombre: z.string().min(1, 'Ingresá un nombre'),
})

export default function EditarCategoria({ categoria, onActualizado, onCancelar }) {
  const [enviando, setEnviando] = useState(false)
  const [cambiandoEstado, setCambiandoEstado] = useState(false)
  const [error, setError] = useState(null)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(esquema),
    defaultValues: { nombre: categoria.nombre || '' },
  })

  async function onSubmit(datos) {
    setEnviando(true)
    setError(null)
    try {
      await actualizarCategoriaProducto(categoria.id, { nombre: datos.nombre })
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
      await actualizarEstadoCategoria(categoria.id, !categoria.activo)
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
        <h3 className="font-medium text-marca">{categoria.nombre}</h3>
        <Badge tono={categoria.activo ? 'exito' : 'error'}>{categoria.activo ? 'Activa' : 'Inactiva'}</Badge>
      </div>

      <Input label="Nombre" error={errors.nombre?.message} {...register('nombre')} />

      {error && <p className="text-sm text-perdida">{error}</p>}

      <div className="mt-2 flex gap-2">
        <Button
          type="button"
          variante={categoria.activo ? 'peligro' : 'confirmar'}
          cargando={cambiandoEstado}
          onClick={alternarActivo}
          className="flex-1"
        >
          {categoria.activo ? 'Desactivar' : 'Activar'}
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
