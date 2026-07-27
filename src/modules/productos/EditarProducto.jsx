import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { actualizarProducto, actualizarEstadoProducto } from '../../lib/productos'
import { listarCategoriasActivas } from '../../lib/categoriasProducto'
import { traducirError } from '../../lib/errores'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

const esquema = z
  .object({
    nombre: z.string().min(1, 'Ingresá un nombre'),
    es_huevo: z.boolean(),
    categoria_id: z.string().optional(),
    admite_caja: z.boolean(),
    unidad_base: z.string().min(1, 'Ingresá la unidad base'),
    equivalencia_caja: z.string().optional(),
    equivalencia_cajon: z.string().optional(),
    stock_minimo_maple: z.string().optional(),
  })
  .refine((datos) => !datos.es_huevo || !!datos.categoria_id, {
    message: 'Elegí una categoría',
    path: ['categoria_id'],
  })

export default function EditarProducto({ producto, onActualizado, onCancelar }) {
  const [categorias, setCategorias] = useState([])
  const [cargandoCategorias, setCargandoCategorias] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [cambiandoEstado, setCambiandoEstado] = useState(false)
  const [error, setError] = useState(null)
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(esquema),
    defaultValues: {
      nombre: producto.nombre || '',
      es_huevo: !!producto.es_huevo,
      categoria_id: producto.categoria_id || '',
      admite_caja: !!producto.admite_caja,
      unidad_base: producto.unidad_base || '',
      equivalencia_caja: producto.equivalencia_caja != null ? String(producto.equivalencia_caja) : '',
      equivalencia_cajon: producto.equivalencia_cajon != null ? String(producto.equivalencia_cajon) : '',
      stock_minimo_maple: producto.stock_minimo_maple != null ? String(producto.stock_minimo_maple) : '',
    },
  })

  useEffect(() => {
    listarCategoriasActivas()
      .then(setCategorias)
      .catch(() => {})
      .finally(() => setCargandoCategorias(false))
  }, [])

  const esHuevo = watch('es_huevo')
  const admiteCaja = watch('admite_caja')

  async function onSubmit(datos) {
    setEnviando(true)
    setError(null)
    try {
      await actualizarProducto(producto.id, {
        nombre: datos.nombre,
        es_huevo: datos.es_huevo,
        categoria_id: datos.es_huevo && datos.categoria_id ? datos.categoria_id : null,
        admite_caja: datos.admite_caja,
        unidad_base: datos.unidad_base,
        equivalencia_caja:
          datos.admite_caja && datos.equivalencia_caja !== '' ? Number(datos.equivalencia_caja) : null,
        equivalencia_cajon: datos.equivalencia_cajon !== '' ? Number(datos.equivalencia_cajon) : null,
        stock_minimo_maple: datos.stock_minimo_maple !== '' ? Number(datos.stock_minimo_maple) : null,
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
      await actualizarEstadoProducto(producto.id, !producto.activo)
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
        <h3 className="font-medium text-marca">{producto.nombre}</h3>
        <Badge tono={producto.activo ? 'exito' : 'error'}>{producto.activo ? 'Activo' : 'Inactivo'}</Badge>
      </div>

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
              <span className="font-medium text-marca">Categoría</span>
              {cargandoCategorias ? (
                <p className="text-sm text-marca/50">Cargando categorías...</p>
              ) : (
                <select
                  className="rounded-lg border border-marca/20 px-3 py-2 outline-none focus:border-marca-claro"
                  {...register('categoria_id')}
                >
                  <option value="">Elegir...</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              )}
              {errors.categoria_id && <span className="text-xs text-perdida">{errors.categoria_id.message}</span>}
            </label>
          )}

          <label className="flex items-center gap-2 text-sm text-marca">
            <input type="checkbox" className="accent-marca" {...register('admite_caja')} />
            Admite venta por caja
          </label>
        </div>
      </div>

      <Input label="Unidad base" error={errors.unidad_base?.message} {...register('unidad_base')} />

      {admiteCaja && (
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
        <Button
          type="button"
          variante={producto.activo ? 'peligro' : 'confirmar'}
          cargando={cambiandoEstado}
          onClick={alternarActivo}
          className="flex-1"
        >
          {producto.activo ? 'Desactivar' : 'Activar'}
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
