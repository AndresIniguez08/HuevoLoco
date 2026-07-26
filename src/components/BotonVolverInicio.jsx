import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { ROLES, RUTA_RAIZ_POR_ROL } from '../lib/constantes'

// Dueño/administrativo navegan por el sidebar completo (AppShell) y nunca
// necesitan esto. Vendedor y depósito entran por una pantalla de inicio
// simplificada sin sidebar (mismo criterio que sucursal/chofer, que ya
// tienen su propio botón "Volver" escrito a mano en cada pantalla) — sin
// este botón quedarían sin forma de volver salvo el botón atrás del navegador.
const ROLES_CON_INICIO_SIMPLIFICADO = [ROLES.VENDEDOR, ROLES.DEPOSITO]

export default function BotonVolverInicio() {
  const perfil = useAuthStore((s) => s.perfil)
  const navigate = useNavigate()

  if (!perfil || !ROLES_CON_INICIO_SIMPLIFICADO.includes(perfil.rol)) return null

  return (
    <button
      onClick={() => navigate(RUTA_RAIZ_POR_ROL[perfil.rol])}
      className="mb-4 flex items-center gap-2 text-lg text-marca"
    >
      <ArrowLeft size={24} /> Volver
    </button>
  )
}
