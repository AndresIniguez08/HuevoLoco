import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listarConteosCerrados } from '../../lib/conteoStock'
import { traducirError } from '../../lib/errores'
import { useAuthStore } from '../../stores/authStore'
import { RUTA_RAIZ_POR_ROL } from '../../lib/constantes'
import Badge from '../../components/ui/Badge'

export default function AuditoriasConteo() {
  const navigate = useNavigate()
  const perfil = useAuthStore((s) => s.perfil)
  const base = RUTA_RAIZ_POR_ROL[perfil?.rol] || ''

  const [conteos, setConteos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    listarConteosCerrados()
      .then(setConteos)
      .catch((e) => setError(traducirError(e)))
      .finally(() => setCargando(false))
  }, [])

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 font-display text-xl text-marca">Auditorías</h1>
      <p className="mb-4 text-sm text-marca/50">Historial de conteos de stock ya cerrados.</p>

      {error && <p className="mb-3 text-sm text-perdida">{error}</p>}

      <div className="rounded-xl bg-white shadow-sm">
        {cargando ? (
          <p className="p-4 text-sm text-marca/60">Cargando...</p>
        ) : conteos.length === 0 ? (
          <p className="p-4 text-sm text-marca/50">Todavía no hay conteos cerrados.</p>
        ) : (
          <ul className="divide-y divide-marca/10">
            {conteos.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => navigate(`${base}/conteo/${c.id}`)}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left text-sm hover:bg-marca/5"
                >
                  <div>
                    <p className="font-medium text-marca">{new Date(c.fecha).toLocaleDateString('es-AR')}</p>
                    <p className="text-marca/50">{c.usuario_nombre || 'Usuario desconocido'}</p>
                  </div>
                  <Badge tono={c.cantidad_diferencias > 0 ? 'alerta' : 'exito'}>
                    {c.cantidad_diferencias > 0
                      ? `${c.cantidad_diferencias} diferencia${c.cantidad_diferencias === 1 ? '' : 's'}`
                      : 'Sin diferencias'}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
