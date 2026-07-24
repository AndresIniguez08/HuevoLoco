import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { crearConteo, listarConteos, listarItemsConteo, guardarItemConteo } from '../../lib/conteoStock'
import { traducirError } from '../../lib/errores'
import Button from '../../components/ui/Button'

function FilaProductoConteo({ item, conteoId }) {
  const [cajones, setCajones] = useState(item.cajones_contado != null ? String(item.cajones_contado) : '')
  const [cajas, setCajas] = useState(item.cajas_contado != null ? String(item.cajas_contado) : '')
  const [maplesSueltos, setMaplesSueltos] = useState(
    item.maples_sueltos_contado != null ? String(item.maples_sueltos_contado) : ''
  )
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(item.cajones_contado != null)
  const [error, setError] = useState(null)

  async function guardar() {
    setGuardando(true)
    setError(null)
    try {
      await guardarItemConteo(conteoId, item.producto_id, Number(cajones) || 0, Number(cajas) || 0, Number(maplesSueltos) || 0)
      setGuardado(true)
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setGuardando(false)
    }
  }

  function cambiar(setter) {
    return (e) => {
      setter(e.target.value)
      setGuardado(false)
    }
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-xl font-medium text-marca">{item.producto?.nombre || 'Producto'}</h2>
        {guardado && !guardando && <Check size={22} className="shrink-0 text-fresco" />}
      </div>
      <p className="mb-3 text-sm text-marca/50">
        Esperado: {item.cajones_esperado} cajones · {item.cajas_esperado} cajas · {item.maples_sueltos_esperado} maples
        sueltos
      </p>
      <div className="grid grid-cols-3 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-marca">Cajones</span>
          <input
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={cajones}
            onChange={cambiar(setCajones)}
            onBlur={guardar}
            className="w-full rounded-xl border border-marca/20 px-2 py-3 text-center text-xl font-mono outline-none focus:border-marca-claro"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-marca">Cajas</span>
          <input
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={cajas}
            onChange={cambiar(setCajas)}
            onBlur={guardar}
            className="w-full rounded-xl border border-marca/20 px-2 py-3 text-center text-xl font-mono outline-none focus:border-marca-claro"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-marca">Maples sueltos</span>
          <input
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={maplesSueltos}
            onChange={cambiar(setMaplesSueltos)}
            onBlur={guardar}
            className="w-full rounded-xl border border-marca/20 px-2 py-3 text-center text-xl font-mono outline-none focus:border-marca-claro"
          />
        </label>
      </div>
      {error && <p className="mt-2 text-sm text-perdida">{error}</p>}
    </div>
  )
}

export default function ConteoSucursal() {
  const navigate = useNavigate()
  const [paso, setPaso] = useState('cargando') // 'cargando' | 'inicio' | 'cargar' | 'listo'
  const [conteoId, setConteoId] = useState(null)
  const [items, setItems] = useState([])
  const [iniciando, setIniciando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    buscarConteoAbierto()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Si ya hay un conteo abierto de esta sucursal (por ejemplo, quedó a medio
  // cargar de una visita anterior a esta pantalla), retoma ese en vez de
  // dejar iniciar uno nuevo — evitar conteos duplicados sin cerrar.
  async function buscarConteoAbierto() {
    try {
      const conteos = await listarConteos()
      const abierto = conteos.find((c) => !c.cerrado)
      if (abierto) {
        await cargarItems(abierto.id)
      } else {
        setPaso('inicio')
      }
    } catch (e) {
      setError(traducirError(e))
      setPaso('inicio')
    }
  }

  async function cargarItems(id) {
    setConteoId(id)
    try {
      const data = await listarItemsConteo(id)
      setItems(data)
      setPaso('cargar')
    } catch (e) {
      setError(traducirError(e))
    }
  }

  async function iniciar() {
    setIniciando(true)
    setError(null)
    try {
      const id = await crearConteo()
      await cargarItems(id)
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setIniciando(false)
    }
  }

  if (paso === 'cargando') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-fondo">
        <p className="text-lg text-marca/60">Cargando...</p>
      </div>
    )
  }

  if (paso === 'listo') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-fondo p-4 text-center">
        <p className="text-3xl font-medium text-fresco">¡Listo!</p>
        <p className="text-lg text-marca/70">Quedó cargado. Central lo va a revisar y cerrar.</p>
        <Button
          variante="confirmar"
          className="min-h-[64px] w-full max-w-xs text-xl"
          onClick={() => navigate('/sucursal/stock')}
        >
          Volver a Stock
        </Button>
      </div>
    )
  }

  if (paso === 'inicio') {
    return (
      <div className="min-h-screen bg-fondo p-4 pb-10">
        <button onClick={() => navigate('/sucursal/stock')} className="mb-4 flex items-center gap-2 text-lg text-marca">
          <ArrowLeft size={24} /> Volver
        </button>
        <h1 className="mb-4 font-display text-2xl text-marca">Control de stock</h1>
        <p className="mb-6 text-lg text-marca/70">
          Recorré el depósito y contá lo que hay de cada producto. Después cargalo acá — Central lo revisa y lo cierra.
        </p>
        {error && <p className="mb-4 text-base text-perdida">{error}</p>}
        <Button variante="confirmar" className="min-h-[64px] w-full text-xl" cargando={iniciando} onClick={iniciar}>
          Iniciar conteo
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-fondo p-4 pb-10">
      <button onClick={() => navigate('/sucursal/stock')} className="mb-4 flex items-center gap-2 text-lg text-marca">
        <ArrowLeft size={24} /> Volver
      </button>
      <h1 className="mb-1 font-display text-2xl text-marca">Control de stock</h1>
      <p className="mb-4 text-base text-marca/60">Cargá lo que contaste de cada producto.</p>

      {error && <p className="mb-4 text-base text-perdida">{error}</p>}

      <div className="flex flex-col gap-4">
        {items.map((it) => (
          <FilaProductoConteo key={it.producto_id} item={it} conteoId={conteoId} />
        ))}
      </div>

      <Button variante="confirmar" className="mt-6 min-h-[64px] w-full text-xl" onClick={() => setPaso('listo')}>
        Terminé de cargar
      </Button>
    </div>
  )
}
