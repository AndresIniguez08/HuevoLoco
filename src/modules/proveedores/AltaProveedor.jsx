import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { crearProveedor } from '../../lib/proveedores'
import { traducirError } from '../../lib/errores'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

const esquema = z.object({
  nombre: z.string().min(1, 'Ingresá un nombre'),
  contacto: z.string().optional(),
  telefono: z.string().optional(),
  plazo_pago_dias: z.string().optional(),
  notas: z.string().optional(),
})

export default function AltaProveedor({ onCreado, onCancelar }) {
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(esquema),
    defaultValues: { contacto: '', telefono: '', plazo_pago_dias: '', notas: '' },
  })

  async function onSubmit(datos) {
    setEnviando(true)
    setError(null)
    try {
      await crearProveedor({
        nombre: datos.nombre,
        contacto: datos.contacto || null,
        telefono: datos.telefono || null,
        plazo_pago_dias: datos.plazo_pago_dias !== '' ? Number(datos.plazo_pago_dias) : null,
        notas: datos.notas || null,
      })
      onCreado()
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <Input label="Nombre" error={errors.nombre?.message} {...register('nombre')} />
      <Input label="Contacto" error={errors.contacto?.message} {...register('contacto')} />
      <Input label="Teléfono" error={errors.telefono?.message} {...register('telefono')} />
      <Input
        label="Plazo de pago (días)"
        tipo="number"
        numerico
        min="0"
        step="1"
        placeholder="Vacío = contado"
        error={errors.plazo_pago_dias?.message}
        {...register('plazo_pago_dias')}
      />

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-marca">Notas</span>
        <textarea
          rows={3}
          placeholder="Ej: entrega los martes y jueves"
          className="rounded-lg border border-marca/20 px-3 py-2 outline-none focus:border-marca-claro"
          {...register('notas')}
        />
      </label>

      {error && <p className="text-sm text-perdida">{error}</p>}

      <div className="mt-2 flex gap-2">
        <Button type="button" variante="secundario" onClick={onCancelar} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" cargando={enviando} className="flex-1">
          Crear proveedor
        </Button>
      </div>
    </form>
  )
}
