import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { crearCategoriaProducto } from '../../lib/categoriasProducto'
import { traducirError } from '../../lib/errores'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

const esquema = z.object({
  nombre: z.string().min(1, 'Ingresá un nombre'),
})

export default function AltaCategoria({ onCreado, onCancelar }) {
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(esquema) })

  async function onSubmit(datos) {
    setEnviando(true)
    setError(null)
    try {
      await crearCategoriaProducto({ nombre: datos.nombre, activo: true })
      onCreado()
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <Input label="Nombre" placeholder="Ej: Jumbo, Categoría 1" error={errors.nombre?.message} {...register('nombre')} />

      {error && <p className="text-sm text-perdida">{error}</p>}

      <div className="mt-2 flex gap-2">
        <Button type="button" variante="secundario" onClick={onCancelar} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" cargando={enviando} className="flex-1">
          Crear categoría
        </Button>
      </div>
    </form>
  )
}
