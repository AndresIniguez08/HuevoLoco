import { useEffect, useState } from 'react'
import { MapPin, Phone, LogOut } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { traducirError } from '../../lib/errores'
import { useAuthStore } from '../../stores/authStore'
import { obtenerTotalesPagadosPorPedidos } from '../../lib/cobranzas'
import { MEDIOS_PAGO, ETIQUETA_UNIDAD } from '../../lib/constantes'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'

// Cobro contra entrega: no tiene sentido "cobrar en cuenta corriente" parado
// en la puerta, así que se excluye esa opción del selector.
const MEDIOS_COBRO_ENTREGA = MEDIOS_PAGO.filter((m) => m.value !== 'cuenta_corriente')

function etiquetaItem(item) {
  const unidad = ETIQUETA_UNIDAD[item.unidad_vendida]
  const etiquetaUnidad = unidad ? (Number(item.cantidad_unidad) === 1 ? unidad.singular : unidad.plural) : item.unidad_vendida
  return `${item.cantidad_unidad} ${etiquetaUnidad} — ${item.productos?.nombre || 'Producto'}`
}

export default function VistaChofer() {
  const usuario = useAuthStore((s) => s.usuario)
  const perfil = useAuthStore((s) => s.perfil)
  const cerrarSesion = useAuthStore((s) => s.cerrarSesion)

  const [entregas, setEntregas] = useState([])
  const [saldosPorPedido, setSaldosPorPedido] = useState(new Map())
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [actualizando, setActualizando] = useState(null)
  const [entregaCobro, setEntregaCobro] = useState(null)

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function cargar() {
    setCargando(true)
    try {
      const hoy = new Date().toISOString().slice(0, 10)
      const { data, error: errorRepartos } = await supabase
        .from('reparto_asignaciones')
        .select(
          '*, pedidos(id, total, estado_pago, clientes(nombre, direccion, telefono), pedido_items(id, cantidad_unidad, unidad_vendida, productos(nombre)))'
        )
        .eq('chofer_id', usuario.id)
        .gte('creado_at', `${hoy}T00:00:00`)
        .order('creado_at')
      if (errorRepartos) throw errorRepartos
      const lista = data || []
      setEntregas(lista)

      const idsPendientes = lista.filter((e) => e.estado !== 'entregado' && e.pedidos).map((e) => e.pedido_id)
      const totalesPagados = await obtenerTotalesPagadosPorPedidos(idsPendientes)
      const saldos = new Map()
      for (const e of lista) {
        if (!e.pedidos) continue
        saldos.set(e.pedido_id, Number(e.pedidos.total) - (totalesPagados.get(e.pedido_id) || 0))
      }
      setSaldosPorPedido(saldos)
      setError(null)
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setCargando(false)
    }
  }

  function iniciarEntrega(entrega) {
    if (entrega.pedidos?.estado_pago === 'pagado') {
      confirmarEntrega(entrega.id)
    } else {
      setEntregaCobro(entrega)
    }
  }

  async function confirmarEntrega(repartoId, montoCobrado, medio, motivoDiferencia) {
    setActualizando(repartoId)
    setError(null)
    try {
      const params = { p_reparto_id: repartoId }
      if (montoCobrado != null) {
        params.p_monto_cobrado = montoCobrado
        params.p_medio = medio
        if (motivoDiferencia) params.p_motivo_diferencia = motivoDiferencia
      }
      const { error: errorRpc } = await supabase.rpc('fn_entregar_pedido', params)
      if (errorRpc) throw errorRpc
      setEntregaCobro(null)
      await cargar()
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setActualizando(null)
    }
  }

  const pendientes = entregas.filter((e) => e.estado !== 'entregado')
  const entregadas = entregas.filter((e) => e.estado === 'entregado')

  return (
    <div className="min-h-screen bg-fondo pb-10">
      <header className="flex items-center justify-between bg-marca px-4 py-4 text-white">
        <div>
          <p className="font-display text-lg leading-none">Mis entregas</p>
          <p className="text-sm text-white/70">{perfil?.nombre}</p>
        </div>
        <button onClick={cerrarSesion} className="rounded-lg p-2 hover:bg-white/10" aria-label="Salir">
          <LogOut size={22} />
        </button>
      </header>

      <div className="p-4">
        {cargando ? (
          <p className="text-center text-marca/60">Cargando entregas...</p>
        ) : error ? (
          <p className="text-center text-perdida">{error}</p>
        ) : entregas.length === 0 ? (
          <p className="text-center text-marca/50">No tenés entregas asignadas hoy.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {pendientes.map((e) => {
              const pagado = e.pedidos?.estado_pago === 'pagado'
              return (
                <div key={e.id} className="rounded-2xl bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-display text-xl text-marca">{e.pedidos?.clientes?.nombre}</p>
                    {!pagado && <Badge tono="neutro">Cobrar al entregar</Badge>}
                  </div>
                  {e.pedidos?.clientes?.direccion && (
                    <p className="mt-2 flex items-center gap-2 text-base text-marca/70">
                      <MapPin size={20} className="shrink-0 text-marca-claro" />
                      {e.pedidos.clientes.direccion}
                    </p>
                  )}
                  {e.pedidos?.clientes?.telefono && (
                    <a
                      href={`tel:${e.pedidos.clientes.telefono}`}
                      className="mt-2 flex items-center gap-2 text-base text-marca-claro"
                    >
                      <Phone size={20} className="shrink-0" />
                      {e.pedidos.clientes.telefono}
                    </a>
                  )}

                  {e.pedidos?.pedido_items?.length > 0 && (
                    <div className="mt-3 border-t border-marca/10 pt-3">
                      <p className="text-sm font-medium text-marca/50">Entregar</p>
                      <ul className="mt-1 flex flex-col gap-1">
                        {e.pedidos.pedido_items.map((it) => (
                          <li key={it.id} className="text-lg font-medium leading-snug text-marca">
                            {etiquetaItem(it)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="mt-3 font-mono text-lg text-marca">${Number(e.pedidos?.total).toFixed(2)}</p>
                  <Button
                    variante="confirmar"
                    tamano="lg"
                    className="mt-4 w-full text-lg"
                    cargando={actualizando === e.id}
                    onClick={() => iniciarEntrega(e)}
                  >
                    {pagado ? 'Marcar como entregado' : 'Cobrar y entregar'}
                  </Button>
                </div>
              )
            })}

            {entregadas.length > 0 && (
              <div>
                <p className="mb-2 mt-4 text-sm font-medium text-marca/50">Entregadas</p>
                <div className="flex flex-col gap-2">
                  {entregadas.map((e) => (
                    <div key={e.id} className="rounded-xl bg-white/60 p-3 text-marca/50 shadow-sm">
                      <p className="font-medium">{e.pedidos?.clientes?.nombre}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ModalCobro
        entrega={entregaCobro}
        saldo={entregaCobro ? saldosPorPedido.get(entregaCobro.pedido_id) : 0}
        enviando={entregaCobro ? actualizando === entregaCobro.id : false}
        onCerrar={() => setEntregaCobro(null)}
        onConfirmar={(monto, medio, motivo) => confirmarEntrega(entregaCobro.id, monto, medio, motivo)}
      />
    </div>
  )
}

function ModalCobro({ entrega, saldo, enviando, onCerrar, onConfirmar }) {
  const [vista, setVista] = useState('cobro') // 'cobro' | 'confirmarDiferencia' | 'motivo'
  const [monto, setMonto] = useState('0')
  const [medio, setMedio] = useState('efectivo')
  const [motivo, setMotivo] = useState('')

  useEffect(() => {
    if (entrega) {
      setVista('cobro')
      setMonto('0')
      setMedio('efectivo')
      setMotivo('')
    }
  }, [entrega])

  if (!entrega) return null

  const diferencia = Number(saldo || 0) - Number(monto || 0)

  function tocarConfirmarEntrega() {
    if (diferencia > 0) {
      setVista('confirmarDiferencia')
    } else {
      onConfirmar(Number(monto), medio)
    }
  }

  if (vista === 'confirmarDiferencia') {
    return (
      <Modal abierto={!!entrega} onCerrar={onCerrar} titulo="Confirmar saldo pendiente">
        <div className="flex flex-col gap-4">
          <p className="text-center text-lg text-marca">
            Vas a dejar un saldo pendiente de{' '}
            <span className="font-mono font-semibold">${diferencia.toFixed(2)}</span>. ¿Confirmás?
          </p>
          <Button variante="confirmar" tamano="lg" className="w-full text-lg" onClick={() => setVista('motivo')}>
            Sí, confirmar
          </Button>
          <Button variante="secundario" tamano="lg" className="w-full text-lg" onClick={() => setVista('cobro')}>
            Volver a revisar
          </Button>
        </div>
      </Modal>
    )
  }

  if (vista === 'motivo') {
    return (
      <Modal abierto={!!entrega} onCerrar={onCerrar} titulo="Motivo de la diferencia">
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-base">
            <span className="font-medium text-marca">¿Por qué cobraste menos de lo esperado?</span>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              placeholder="Cliente pagó menos / Arreglo en sucursal / Error de carga, corrijo después"
              className="rounded-lg border border-marca/20 px-3 py-3 text-lg outline-none focus:border-marca-claro"
            />
          </label>
          <Button
            variante="confirmar"
            tamano="lg"
            className="w-full text-lg"
            cargando={enviando}
            disabled={!motivo.trim()}
            onClick={() => onConfirmar(Number(monto), medio, motivo)}
          >
            Confirmar entrega
          </Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal abierto={!!entrega} onCerrar={onCerrar} titulo="Cobrar al entregar">
      <div className="flex flex-col gap-4">
        <div className="rounded-xl bg-marca p-4 text-center text-white">
          <p className="text-sm text-white/70">Saldo pendiente</p>
          <p className="font-mono text-4xl leading-tight">${Number(saldo || 0).toFixed(2)}</p>
        </div>

        <Input
          label="¿Cuánto cobraste?"
          tipo="number"
          numerico
          min="0"
          step="0.01"
          className="py-3 text-lg"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
        />

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-marca">Medio de cobro</span>
          <select
            value={medio}
            onChange={(e) => setMedio(e.target.value)}
            className="rounded-lg border border-marca/20 px-3 py-3 text-lg outline-none focus:border-marca-claro"
          >
            {MEDIOS_COBRO_ENTREGA.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        <Button variante="confirmar" tamano="lg" className="w-full text-lg" cargando={enviando} onClick={tocarConfirmarEntrega}>
          Confirmar entrega
        </Button>
      </div>
    </Modal>
  )
}
