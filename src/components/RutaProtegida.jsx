import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export default function RutaProtegida({ rolesPermitidos, children }) {
  const usuario = useAuthStore((s) => s.usuario)
  const perfil = useAuthStore((s) => s.perfil)
  const cargando = useAuthStore((s) => s.cargando)

  if (cargando) {
    return <div className="flex min-h-screen items-center justify-center text-marca/60">Cargando...</div>
  }

  if (!usuario) {
    return <Navigate to="/login" replace />
  }

  if (!perfil) {
    return <div className="flex min-h-screen items-center justify-center text-marca/60">Cargando tu perfil...</div>
  }

  if (rolesPermitidos && !rolesPermitidos.includes(perfil.rol)) {
    return <Navigate to="/login" replace />
  }

  return children
}
