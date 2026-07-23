import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle } from 'lucide-react'
import { crearCliente } from '../../lib/clientes'
import { listarListasPrecio } from '../../lib/listasPrecio'
import { traducirError } from '../../lib/errores'
import { TIPOS_CLIENTE } from '../../lib/constantes'
import { useAuthStore } from '../../stores/authStore'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

const esquema = z.object({
  nombre: z.string().min(1, 'Ingresá un nombre'),
  tipo: z.string().min(1, 'Elegí un tipo'),
  lista_precio_id: z.string().optional(),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  email: z.string().email('Ingresá un email válido').optional().or(z.literal('')),
})

export default function AltaCliente({ onCreado, onCancelar }) {
  const perfil = useAuthStore((s) => s.perfil)
  const [listasPrecio, setListasPrecio] = useState([])
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const [creado, setCreado] = useState(null)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(esquema),
    defaultValues: { tipo: 'minorista', lista_precio_id: '', telefono: '', direccion: '', email: '' },
  })

  useEffect(() => {
    listarListasPrecio().then(setListasPrecio).catch(() => {})
  }, [])

  async function onSubmit(datos) {
    setEnviando(true)
    setError(null)
    try {
      await crearCliente({
        nombre: datos.nombre,
        tipo: datos.tipo,
        lista_precio_id: datos.lista_precio_id || null,
        telefono: datos.telefono || null,
        direccion: datos.direccion || null,
        email: datos.email || null,
        sucursal_id: perfil.sucursal_id,
      })
      setCreado({ nombre: datos.nombre })
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setEnviando(false)
    }
  }

  if (creado) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <CheckCircle size={40} className="text-fresco" />
        <p className="text-sm text-marca">{creado.nombre} se cargó con éxito</p>
        <Button onClick={onCreado} className="w-full">
          Aceptar
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
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

      {error && <p className="text-sm text-perdida">{error}</p>}

      <div className="mt-2 flex gap-2">
        <Button type="button" variante="secundario" onClick={onCancelar} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" cargando={enviando} className="flex-1">
          Crear cliente
        </Button>
      </div>
    </form>
  )
}
