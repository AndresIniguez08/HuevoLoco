import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  obtenerConteo,
  listarItemsConteo,
  guardarItemConteo,
  cerrarConteo,
} from '../../lib/conteoStock'
import { traducirError } from '../../lib/errores'
import { useAuthStore } from '../../stores/authStore'
import { ROLES } from '../../lib/constantes'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'

function formatearDiferencia(valor) {
  if (valor == null) return '—'
  return valor > 0 ? `+${valor}` : `${valor}`
}

function FilaConteoItem({ item, cerrado, onGuardado }) {
  const [cajones, setCajones] = useState(item.cajones_contado != null ? String(item.cajones_contado) : '')
  const [cajas, setCajas] = useState(item.cajas_contado != null ? String(item.cajas_contado) : '')
  const [maplesSueltos, setMaplesSueltos] = useState(
    item.maples_sueltos_contado != null ? String(item.maples_sueltos_contado) : ''
  )
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  async function guardar() {
    setGuardando(true)
    setError(null)
    try {
      await guardarItemConteo(item.conteo_id, item.producto_id, Number(cajones) || 0, Number(cajas) || 0, Number(maplesSueltos) || 0)
      await onGuardado()
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setGuardando(false)
    }
  }

  const hayDiferencia =
    (item.diferencia_cajones ?? 0) !== 0 ||
    (item.diferencia_cajas ?? 0) !== 0 ||
    (item.diferencia_maples_sueltos ?? 0) !== 0
  const cargado = item.cajones_contado != null && item.cajas_contado != null

  return (
    <tr className="border-b border-marca/10 text-sm">
      <td className="p-3 font-medium text-marca">{item.producto?.nombre || 'Producto'}</td>
      <td className="p-3 text-marca/50">{item.cajones_esperado}</td>
      <td className="p-3 text-marca/50">{item.cajas_esperado}</td>
      <td className="p-3 text-marca/50">{item.maples_sueltos_esperado}</td>
      <td className="p-3">
        <input
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          disabled={cerrado}
          value={cajones}
          onChange={(e) => setCajones(e.target.value)}
          onBlur={guardar}
          className="w-20 rounded-lg border border-marca/20 px-2 py-1 font-mono outline-none focus:border-marca-claro disabled:bg-marca/5"
        />
      </td>
      <td className="p-3">
        <input
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          disabled={cerrado}
          value={cajas}
          onChange={(e) => setCajas(e.target.value)}
          onBlur={guardar}
          className="w-20 rounded-lg border border-marca/20 px-2 py-1 font-mono outline-none focus:border-marca-claro disabled:bg-marca/5"
        />
      </td>
      <td className="p-3">
        <input
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          disabled={cerrado}
          value={maplesSueltos}
          onChange={(e) => setMaplesSueltos(e.target.value)}
          onBlur={guardar}
          className="w-20 rounded-lg border border-marca/20 px-2 py-1 font-mono outline-none focus:border-marca-claro disabled:bg-marca/5"
        />
      </td>
      <td className="p-3 font-mono">
        {cargado ? (
          <span className={hayDiferencia ? 'text-perdida' : 'text-fresco'}>
            {formatearDiferencia(item.diferencia_cajones)} cajones / {formatearDiferencia(item.diferencia_cajas)} cajas /{' '}
            {formatearDiferencia(item.diferencia_maples_sueltos)} maples sueltos
          </span>
        ) : (
          <span className="text-marca/30">Sin cargar</span>
        )}
        {!cerrado && (
          <Button tamano="sm" variante="fantasma" cargando={guardando} onClick={guardar} className="ml-2">
            Guardar
          </Button>
        )}
        {error && <p className="mt-1 text-xs text-perdida">{error}</p>}
      </td>
    </tr>
  )
}

export default function DetalleConteo() {
  const { id } = useParams()
  const perfil = useAuthStore((s) => s.perfil)
  const puedeCerrar = perfil?.rol === ROLES.DUENO || perfil?.rol === ROLES.ADMINISTRATIVO

  const [conteo, setConteo] = useState(null)
  const [items, setItems] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [modalCerrar, setModalCerrar] = useState(false)
  const [cerrando, setCerrando] = useState(false)

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function cargar() {
    setCargando(true)
    try {
      const [datosConteo, datosItems] = await Promise.all([obtenerConteo(id), listarItemsConteo(id)])
      setConteo(datosConteo)
      setItems(datosItems)
      setError(null)
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setCargando(false)
    }
  }

  async function confirmarCierre() {
    setCerrando(true)
    setError(null)
    try {
      await cerrarConteo(id)
      setModalCerrar(false)
      await cargar()
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setCerrando(false)
    }
  }

  if (cargando) return <p className="text-marca/60">Cargando conteo...</p>
  if (error && !conteo) return <p className="text-perdida">{error}</p>

  const itemsConDiferencia = items.filter(
    (it) => (it.diferencia_cajones ?? 0) !== 0 || (it.diferencia_cajas ?? 0) !== 0
  )

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl text-marca">
            Conteo del {conteo && new Date(conteo.fecha).toLocaleDateString('es-AR')}
          </h1>
        </div>
        <Badge tono={conteo?.cerrado ? 'exito' : 'neutro'}>{conteo?.cerrado ? 'Cerrado' : 'Abierto'}</Badge>
      </div>

      {error && <p className="mb-3 text-sm text-perdida">{error}</p>}

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-marca/10 text-sm text-marca/50">
              <th className="p-3 font-medium">Producto</th>
              <th className="p-3 font-medium">Cajones esperados</th>
              <th className="p-3 font-medium">Cajas esperadas</th>
              <th className="p-3 font-medium">Maples sueltos esperados</th>
              <th className="p-3 font-medium">Cajones contados</th>
              <th className="p-3 font-medium">Cajas contadas</th>
              <th className="p-3 font-medium">Maples sueltos contados</th>
              <th className="p-3 font-medium">Diferencia</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <FilaConteoItem key={it.producto_id} item={it} cerrado={!!conteo?.cerrado} onGuardado={cargar} />
            ))}
          </tbody>
        </table>
      </div>

      {!conteo?.cerrado && puedeCerrar && (
        <Button variante="peligro" className="mt-4" onClick={() => setModalCerrar(true)}>
          Cerrar conteo y aplicar ajustes
        </Button>
      )}

      <Modal abierto={modalCerrar} onCerrar={() => setModalCerrar(false)} titulo="Cerrar conteo">
        <p className="mb-4 text-sm text-marca">
          Esto va a ajustar el stock del sistema para que coincida con lo contado.{' '}
          {itemsConDiferencia.length > 0 ? (
            <>
              <strong>{itemsConDiferencia.length}</strong> producto{itemsConDiferencia.length === 1 ? '' : 's'}{' '}
              {itemsConDiferencia.length === 1 ? 'tiene' : 'tienen'} diferencia respecto a lo esperado.
            </>
          ) : (
            'Ningún producto tiene diferencia respecto a lo esperado.'
          )}
        </p>
        <div className="flex gap-2">
          <Button variante="secundario" className="flex-1" onClick={() => setModalCerrar(false)}>
            Cancelar
          </Button>
          <Button variante="peligro" className="flex-1" cargando={cerrando} onClick={confirmarCierre}>
            Confirmar cierre
          </Button>
        </div>
      </Modal>
    </div>
  )
}
