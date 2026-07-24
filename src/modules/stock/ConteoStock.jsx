import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { crearConteo, listarConteos } from '../../lib/conteoStock'
import { traducirError } from '../../lib/errores'
import { useAuthStore } from '../../stores/authStore'
import { RUTA_RAIZ_POR_ROL } from '../../lib/constantes'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'

export default function ConteoStock() {
  const navigate = useNavigate()
  const perfil = useAuthStore((s) => s.perfil)
  const base = RUTA_RAIZ_POR_ROL[perfil?.rol] || ''

  const [conteos, setConteos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [creando, setCreando] = useState(false)
  const [conteoNuevo, setConteoNuevo] = useState(null)

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setCargando(true)
    try {
      const data = await listarConteos()
      setConteos(data)
      setError(null)
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setCargando(false)
    }
  }

  async function iniciarConteo() {
    setCreando(true)
    setError(null)
    try {
      const id = await crearConteo()
      setConteoNuevo(id)
      await cargar()
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setCreando(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl text-marca">Conteo de stock</h1>
        <Button onClick={iniciarConteo} cargando={creando}>
          Iniciar nuevo conteo
        </Button>
      </div>

      {conteoNuevo && (
        <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm text-marca">Conteo iniciado. Imprimí la hoja para recorrer el depósito, o cargá los resultados directamente.</p>
          <div className="flex gap-2">
            <Button
              variante="secundario"
              className="flex-1"
              onClick={() => window.open(`/conteo/${conteoNuevo}/imprimir`, '_blank')}
            >
              Imprimir hoja de conteo
            </Button>
            <Button className="flex-1" onClick={() => navigate(`${base}/conteo/${conteoNuevo}`)}>
              Cargar resultados
            </Button>
          </div>
        </div>
      )}

      {error && <p className="mb-3 text-sm text-perdida">{error}</p>}

      <div className="rounded-xl bg-white shadow-sm">
        {cargando ? (
          <p className="p-4 text-sm text-marca/60">Cargando conteos...</p>
        ) : conteos.length === 0 ? (
          <p className="p-4 text-sm text-marca/50">Todavía no se hizo ningún conteo.</p>
        ) : (
          <ul className="divide-y divide-marca/10">
            {conteos.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => navigate(`${base}/conteo/${c.id}`)}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left text-sm hover:bg-marca/5"
                >
                  <span className="flex items-center gap-2">
                    <span className="font-medium text-marca">{new Date(c.fecha).toLocaleDateString('es-AR')}</span>
                    <Badge tono="neutro">{c.sucursales?.nombre || '—'}</Badge>
                  </span>
                  <Badge tono={c.cerrado ? 'exito' : 'neutro'}>{c.cerrado ? 'Cerrado' : 'Abierto'}</Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
