import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { actualizarProveedor, actualizarEstadoProveedor } from '../../lib/proveedores'
import { traducirError } from '../../lib/errores'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

const esquema = z.object({
  nombre: z.string().min(1, 'Ingresá un nombre'),
  contacto: z.string().optional(),
  telefono: z.string().optional(),
  plazo_pago_dias: z.string().optional(),
  notas: z.string().optional(),
})

export default function EditarProveedor({ proveedor, onActualizado, onCancelar }) {
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
      nombre: proveedor.nombre || '',
      contacto: proveedor.contacto || '',
      telefono: proveedor.telefono || '',
      plazo_pago_dias: proveedor.plazo_pago_dias != null ? String(proveedor.plazo_pago_dias) : '',
      notas: proveedor.notas || '',
    },
  })

  async function onSubmit(datos) {
    setEnviando(true)
    setError(null)
    try {
      await actualizarProveedor(proveedor.id, {
        nombre: datos.nombre,
        contacto: datos.contacto || null,
        telefono: datos.telefono || null,
        plazo_pago_dias: datos.plazo_pago_dias !== '' ? Number(datos.plazo_pago_dias) : null,
        notas: datos.notas || null,
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
      await actualizarEstadoProveedor(proveedor.id, !proveedor.activo)
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
        <h3 className="font-medium text-marca">{proveedor.nombre}</h3>
        <Badge tono={proveedor.activo ? 'exito' : 'error'}>{proveedor.activo ? 'Activo' : 'Inactivo'}</Badge>
      </div>

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
        <Button
          type="button"
          variante={proveedor.activo ? 'peligro' : 'confirmar'}
          cargando={cambiandoEstado}
          onClick={alternarActivo}
          className="flex-1"
        >
          {proveedor.activo ? 'Desactivar' : 'Activar'}
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
