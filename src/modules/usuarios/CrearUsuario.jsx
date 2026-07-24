import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { crearUsuario } from '../../lib/usuarios'
import { listarSucursales } from '../../lib/transferencias'
import { ROLES, ROLES_ASIGNABLES } from '../../lib/constantes'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

const esquema = z
  .object({
    nombre: z.string().min(1, 'Ingresá un nombre'),
    email: z.string().email('Ingresá un email válido'),
    password: z.string().min(6, 'La contraseña tiene que tener al menos 6 caracteres'),
    rol: z.string().min(1, 'Elegí un rol'),
    sucursal_id: z.string().optional(),
  })
  .refine((datos) => datos.rol !== ROLES.ENCARGADO_SUCURSAL || !!datos.sucursal_id, {
    message: 'Elegí una sucursal',
    path: ['sucursal_id'],
  })

export default function CrearUsuario({ onCreado, onCancelar }) {
  const [sucursales, setSucursales] = useState([])
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({ resolver: zodResolver(esquema), defaultValues: { rol: '', sucursal_id: '' } })

  const rolSeleccionado = watch('rol')

  useEffect(() => {
    // Casa Central ya tiene sus propios roles (dueño/administrativo/depósito/
    // vendedor) — este selector es solo para las sucursales que usan la
    // interfaz simplificada de encargado_sucursal.
    listarSucursales()
      .then((data) => setSucursales(data.filter((s) => s.nombre !== 'Casa Central')))
      .catch(() => {})
  }, [])

  async function onSubmit(datos) {
    setEnviando(true)
    setError(null)
    try {
      await crearUsuario({
        ...datos,
        sucursal_id: datos.rol === ROLES.ENCARGADO_SUCURSAL ? datos.sucursal_id : null,
      })
      onCreado()
    } catch (e) {
      setError(e.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <Input label="Nombre" error={errors.nombre?.message} {...register('nombre')} />
      <Input
        label="Email"
        tipo="email"
        autoComplete="off"
        error={errors.email?.message}
        {...register('email')}
      />
      <Input
        label="Contraseña temporal"
        tipo="password"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-marca">Rol</span>
        <select
          className="rounded-lg border border-marca/20 px-3 py-2 outline-none focus:border-marca-claro"
          {...register('rol')}
        >
          <option value="">Elegir...</option>
          {ROLES_ASIGNABLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        {errors.rol && <span className="text-xs text-perdida">{errors.rol.message}</span>}
      </label>

      {rolSeleccionado === ROLES.ENCARGADO_SUCURSAL && (
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-marca">Sucursal</span>
          <select
            className="rounded-lg border border-marca/20 px-3 py-2 outline-none focus:border-marca-claro"
            {...register('sucursal_id')}
          >
            <option value="">Elegir...</option>
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
          {errors.sucursal_id && <span className="text-xs text-perdida">{errors.sucursal_id.message}</span>}
        </label>
      )}

      {error && <p className="text-sm text-perdida">{error}</p>}

      <div className="mt-2 flex gap-2">
        <Button type="button" variante="secundario" onClick={onCancelar} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" cargando={enviando} className="flex-1">
          Crear usuario
        </Button>
      </div>
    </form>
  )
}
