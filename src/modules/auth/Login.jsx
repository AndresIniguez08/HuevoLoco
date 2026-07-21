import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { RUTA_RAIZ_POR_ROL } from '../../lib/constantes'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

const esquema = z.object({
  email: z.string().email('Ingresá un email válido'),
  password: z.string().min(1, 'Ingresá tu contraseña'),
})

export default function Login() {
  const { usuario, perfil, error, iniciarSesion } = useAuthStore()
  const [enviando, setEnviando] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(esquema) })

  useEffect(() => {
    useAuthStore.setState({ error: null })
  }, [])

  if (usuario && perfil) {
    return <Navigate to={RUTA_RAIZ_POR_ROL[perfil.rol] || '/login'} replace />
  }

  async function onSubmit(datos) {
    setEnviando(true)
    await iniciarSesion(datos.email, datos.password)
    setEnviando(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-fondo px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-sm">
        <h1 className="mb-1 font-display text-2xl text-marca">Huevo Loco</h1>
        <p className="mb-6 text-sm text-marca/60">Iniciá sesión para continuar</p>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            label="Email"
            tipo="email"
            autoComplete="username"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Contraseña"
            tipo="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />
          {error && <p className="text-sm text-perdida">{error}</p>}
          <Button type="submit" cargando={enviando} className="mt-2 w-full">
            Iniciar sesión
          </Button>
        </form>
      </div>
    </div>
  )
}
