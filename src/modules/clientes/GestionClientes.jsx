import { useEffect, useState } from 'react'
import { obtenerPedidosCliente } from '../../lib/clientes'
import { traducirError } from '../../lib/errores'
import { ETIQUETA_ESTADO_PEDIDO, TONO_ESTADO_PEDIDO, ETIQUETA_ESTADO_PAGO, TONO_ESTADO_PAGO } from '../../lib/constantes'
import BuscadorCliente from '../../components/BuscadorCliente'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import AltaCliente from './AltaCliente'
import EditarCliente from './EditarCliente'

export default function GestionClientes() {
  const [cliente, setCliente] = useState(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [refrescarBuscador, setRefrescarBuscador] = useState(0)
  const [pedidos, setPedidos] = useState([])
  const [cargandoPedidos, setCargandoPedidos] = useState(false)
  const [errorPedidos, setErrorPedidos] = useState(null)

  useEffect(() => {
    if (!cliente) {
      setPedidos([])
      return
    }
    setCargandoPedidos(true)
    obtenerPedidosCliente(cliente.id)
      .then(setPedidos)
      .catch((e) => setErrorPedidos(traducirError(e)))
      .finally(() => setCargandoPedidos(false))
  }, [cliente])

  function altaOk() {
    setModalAbierto(false)
    setRefrescarBuscador((n) => n + 1)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl text-marca">Gestión de clientes</h1>
        <Button onClick={() => setModalAbierto(true)}>Nuevo cliente</Button>
      </div>

      <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
        <BuscadorCliente onSeleccionar={setCliente} mostrarFiltroInactivos refrescar={refrescarBuscador} />
      </div>

      {cliente && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <EditarCliente cliente={cliente} onActualizado={() => setCliente(null)} onCancelar={() => setCliente(null)} />
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-medium text-marca">Últimos pedidos</h3>
            {cargandoPedidos ? (
              <p className="text-sm text-marca/60">Cargando pedidos...</p>
            ) : errorPedidos ? (
              <p className="text-sm text-perdida">{errorPedidos}</p>
            ) : pedidos.length === 0 ? (
              <p className="text-sm text-marca/50">Este cliente todavía no tiene pedidos.</p>
            ) : (
              <ul className="divide-y divide-marca/10 text-sm">
                {pedidos.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 py-2">
                    <span className="text-marca/70">{new Date(p.creado_at).toLocaleDateString('es-AR')}</span>
                    <span className="font-mono">${Number(p.total).toFixed(2)}</span>
                    <Badge tono={TONO_ESTADO_PEDIDO[p.estado] || 'neutro'}>{ETIQUETA_ESTADO_PEDIDO[p.estado] || p.estado}</Badge>
                    <Badge tono={TONO_ESTADO_PAGO[p.estado_pago] || 'neutro'}>
                      {ETIQUETA_ESTADO_PAGO[p.estado_pago] || p.estado_pago}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <Modal abierto={modalAbierto} onCerrar={() => setModalAbierto(false)} titulo="Nuevo cliente">
        <AltaCliente onCreado={altaOk} onCancelar={() => setModalAbierto(false)} />
      </Modal>
    </div>
  )
}
