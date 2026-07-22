import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { listarComprasProveedor, registrarPagoProveedor } from '../../lib/proveedores'
import { traducirError } from '../../lib/errores'
import { MEDIOS_PAGO } from '../../lib/constantes'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

const esquema = z.object({
  monto: z
    .string()
    .min(1, 'Ingresá un monto')
    .refine((v) => Number(v) > 0, 'El monto tiene que ser mayor a cero'),
  medio: z.string().min(1, 'Elegí un medio de pago'),
  compra_id: z.string().optional(),
})

export default function RegistrarPagoProveedor({ proveedorId, onGuardado, onCancelar }) {
  const [compras, setCompras] = useState([])
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(esquema),
    defaultValues: { monto: '', medio: '', compra_id: '' },
  })

  useEffect(() => {
    listarComprasProveedor(proveedorId).then(setCompras).catch(() => {})
  }, [proveedorId])

  async function onSubmit(datos) {
    setEnviando(true)
    setError(null)
    try {
      await registrarPagoProveedor(proveedorId, datos.compra_id || null, Number(datos.monto), datos.medio)
      onGuardado()
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <Input
        label="Monto"
        tipo="number"
        numerico
        min="0"
        step="0.01"
        error={errors.monto?.message}
        {...register('monto')}
      />

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-marca">Medio de pago</span>
        <select
          className="rounded-lg border border-marca/20 px-3 py-2 outline-none focus:border-marca-claro"
          {...register('medio')}
        >
          <option value="">Elegir...</option>
          {MEDIOS_PAGO.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        {errors.medio && <span className="text-xs text-perdida">{errors.medio.message}</span>}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-marca">Compra que paga (opcional)</span>
        <select
          className="rounded-lg border border-marca/20 px-3 py-2 outline-none focus:border-marca-claro"
          {...register('compra_id')}
        >
          <option value="">Pago genérico a cuenta</option>
          {compras.map((c) => (
            <option key={c.id} value={c.id}>
              {new Date(c.creado_at).toLocaleDateString('es-AR')} — ${Number(c.total).toFixed(2)}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="text-sm text-perdida">{error}</p>}

      <div className="mt-2 flex gap-2">
        <Button type="button" variante="secundario" onClick={onCancelar} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" cargando={enviando} className="flex-1">
          Registrar pago
        </Button>
      </div>
    </form>
  )
}
