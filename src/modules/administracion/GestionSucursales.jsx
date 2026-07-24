import { useEffect, useState } from 'react'
import { listarSucursales, configurarCCSucursal } from '../../lib/transferencias'
import { traducirError } from '../../lib/errores'
import Button from '../../components/ui/Button'

function TarjetaSucursal({ sucursal, onGuardado }) {
  const [habilitada, setHabilitada] = useState(!!sucursal.cc_habilitada_default)
  const [limite, setLimite] = useState(
    sucursal.cc_limite_default != null ? String(sucursal.cc_limite_default) : ''
  )
  const [sinGuardar, setSinGuardar] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  function alternar() {
    setHabilitada((v) => !v)
    setSinGuardar(true)
  }

  function cambiarLimite(valor) {
    setLimite(valor)
    setSinGuardar(true)
  }

  async function guardar() {
    setGuardando(true)
    setError(null)
    try {
      await configurarCCSucursal(sucursal.id, habilitada, Number(limite) || 0)
      setSinGuardar(false)
      onGuardado()
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <h2 className="mb-3 font-medium text-marca">{sucursal.nombre}</h2>

      <div className="mb-3 flex items-center justify-between gap-4">
        <span className="text-sm text-marca/70">Activar cuenta corriente para esta sucursal</span>
        <button
          type="button"
          role="switch"
          aria-checked={habilitada}
          onClick={alternar}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
            habilitada ? 'bg-fresco' : 'bg-marca/20'
          }`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              habilitada ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <label className="mb-3 flex flex-col gap-1 text-sm">
        <span className="font-medium text-marca">Disponible por cliente</span>
        <input
          type="number"
          min="0"
          step="0.01"
          disabled={!habilitada}
          value={limite}
          onChange={(e) => cambiarLimite(e.target.value)}
          className="w-40 rounded-lg border border-marca/20 px-3 py-2 font-mono outline-none focus:border-marca-claro disabled:bg-marca/5 disabled:text-marca/40"
        />
      </label>
      <p className="mb-3 text-xs text-marca/50">
        Límite que aplica a los clientes de esta sucursal que no tengan un límite propio distinto.
      </p>

      {error && <p className="mb-2 text-sm text-perdida">{error}</p>}

      <Button tamano="sm" cargando={guardando} disabled={!sinGuardar} onClick={guardar}>
        Guardar
      </Button>
    </div>
  )
}

export default function GestionSucursales() {
  const [sucursales, setSucursales] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setCargando(true)
    try {
      const data = await listarSucursales()
      // Casa Central no maneja cuenta corriente "por sucursal": dueño/admin
      // ya autorizan cliente por cliente ahí, como siempre.
      setSucursales(data.filter((s) => s.nombre !== 'Casa Central'))
      setError(null)
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 font-display text-xl text-marca">Sucursales</h1>
      <p className="mb-4 text-sm text-marca/60">
        Cuenta corriente general por sucursal: si está activada, sus clientes pueden confirmar pedidos a crédito hasta
        el límite de acá sin necesitar autorización individual.
      </p>

      {error && <p className="mb-3 text-sm text-perdida">{error}</p>}

      {cargando ? (
        <p className="text-sm text-marca/60">Cargando sucursales...</p>
      ) : sucursales.length === 0 ? (
        <p className="text-sm text-marca/50">No hay sucursales para configurar (aparte de Casa Central).</p>
      ) : (
        <div className="flex flex-col gap-4">
          {sucursales.map((s) => (
            <TarjetaSucursal key={s.id} sucursal={s} onGuardado={cargar} />
          ))}
        </div>
      )}
    </div>
  )
}
