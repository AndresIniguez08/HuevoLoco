import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle } from 'lucide-react'
import { crearProducto } from '../../lib/productos'
import { traducirError } from '../../lib/errores'
import { CATEGORIAS_HUEVO, CATEGORIAS_HUEVO_ADMITEN_CAJA } from '../../lib/constantes'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

const esquema = z
  .object({
    nombre: z.string().min(1, 'Ingresá un nombre'),
    es_huevo: z.boolean(),
    categoria_huevo: z.string().optional(),
    admite_caja: z.boolean(),
    unidad_base: z.string().min(1, 'Ingresá la unidad base'),
    equivalencia_caja: z.string().optional(),
    equivalencia_cajon: z.string().optional(),
    stock_minimo_maple: z.string().optional(),
  })
  .refine((datos) => !datos.es_huevo || !!datos.categoria_huevo, {
    message: 'Elegí una categoría de huevo',
    path: ['categoria_huevo'],
  })

export default function AltaProducto({ onCreado, onCancelar }) {
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const [creado, setCreado] = useState(null)
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(esquema),
    defaultValues: {
      nombre: '',
      es_huevo: true,
      categoria_huevo: '',
      admite_caja: false,
      unidad_base: 'maple',
      equivalencia_caja: '',
      equivalencia_cajon: '',
      stock_minimo_maple: '',
    },
  })

  const esHuevo = watch('es_huevo')
  const categoriaHuevo = watch('categoria_huevo')
  const admiteCaja = watch('admite_caja')
  const categoriaAdmiteCaja = CATEGORIAS_HUEVO_ADMITEN_CAJA.includes(categoriaHuevo)

  useEffect(() => {
    if (!categoriaAdmiteCaja && admiteCaja) setValue('admite_caja', false)
  }, [categoriaAdmiteCaja, admiteCaja, setValue])

  async function onSubmit(datos) {
    setEnviando(true)
    setError(null)
    try {
      await crearProducto({
        nombre: datos.nombre,
        es_huevo: datos.es_huevo,
        categoria_huevo: datos.es_huevo ? datos.categoria_huevo : null,
        admite_caja: datos.es_huevo && categoriaAdmiteCaja && datos.admite_caja,
        unidad_base: datos.unidad_base,
        equivalencia_caja:
          datos.admite_caja && datos.equivalencia_caja !== '' ? Number(datos.equivalencia_caja) : null,
        equivalencia_cajon: datos.equivalencia_cajon !== '' ? Number(datos.equivalencia_cajon) : null,
        stock_minimo_maple: datos.stock_minimo_maple !== '' ? Number(datos.stock_minimo_maple) : null,
        activo: true,
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
      <div>
        <Input label="Nombre comercial" error={errors.nombre?.message} {...register('nombre')} />
        <p className="mt-1 text-xs text-marca/50">
          Este es el nombre que vas a ver en pedidos y stock — podés ponerle el que uses habitualmente, no tiene
          que coincidir con la categoría.
        </p>
      </div>

      <div className="rounded-lg border border-marca/10 bg-fondo/60 p-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-marca/40">
          Clasificación interna (no la ve el cliente)
        </p>
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-2 text-sm text-marca">
            <input type="checkbox" className="accent-marca" {...register('es_huevo')} />
            Es huevo
          </label>

          {esHuevo && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-marca">Categoría de huevo</span>
              <select
                className="rounded-lg border border-marca/20 px-3 py-2 outline-none focus:border-marca-claro"
                {...register('categoria_huevo')}
              >
                <option value="">Elegir...</option>
                {CATEGORIAS_HUEVO.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              {errors.categoria_huevo && (
                <span className="text-xs text-perdida">{errors.categoria_huevo.message}</span>
              )}
            </label>
          )}

          <label className={`flex items-center gap-2 text-sm ${categoriaAdmiteCaja ? 'text-marca' : 'text-marca/30'}`}>
            <input
              type="checkbox"
              className="accent-marca"
              disabled={!categoriaAdmiteCaja}
              {...register('admite_caja')}
            />
            Admite venta por caja
          </label>
          {esHuevo && !categoriaAdmiteCaja && (
            <p className="-mt-2 text-xs text-marca/50">Solo las categorías 3, 2 y 1 admiten venta por caja.</p>
          )}
        </div>
      </div>

      <Input label="Unidad base" error={errors.unidad_base?.message} {...register('unidad_base')} />

      {admiteCaja && categoriaAdmiteCaja && (
        <Input
          label="Equivalencia por caja (en maples)"
          tipo="number"
          numerico
          min="0"
          step="1"
          {...register('equivalencia_caja')}
        />
      )}

      <Input
        label="Equivalencia por cajón (en maples)"
        tipo="number"
        numerico
        min="0"
        step="1"
        {...register('equivalencia_cajon')}
      />

      <Input
        label="Stock mínimo (en maples)"
        tipo="number"
        numerico
        min="0"
        step="1"
        {...register('stock_minimo_maple')}
      />

      {error && <p className="text-sm text-perdida">{error}</p>}

      <div className="mt-2 flex gap-2">
        <Button type="button" variante="secundario" onClick={onCancelar} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" cargando={enviando} className="flex-1">
          Crear producto
        </Button>
      </div>
    </form>
  )
}
