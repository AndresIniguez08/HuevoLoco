import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { listarSaldosClientes } from '../../lib/cobranzas'
import { traducirError } from '../../lib/errores'
import Button from '../../components/ui/Button'

function telefonoLimpio(telefono) {
  return (telefono || '').replace(/[\s-]/g, '')
}

function mensajeWhatsapp(cliente) {
  const texto = `Hola ${cliente.nombre}, te escribimos de Huevo Loco para recordarte que tenés un saldo pendiente de $${Number(cliente.saldo).toFixed(2)}. ¡Gracias!`
  return `https://wa.me/${telefonoLimpio(cliente.telefono)}?text=${encodeURIComponent(texto)}`
}

export default function ReporteDeuda() {
  const location = useLocation()
  const rutaBase = location.pathname.split('/')[1]
  const [clientes, setClientes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    listarSaldosClientes()
      .then(setClientes)
      .catch((e) => setError(traducirError(e)))
      .finally(() => setCargando(false))
  }, [])

  if (cargando) return <p className="text-marca/60">Cargando reporte...</p>
  if (error) return <p className="text-perdida">{error}</p>

  const totalAdeudado = clientes.reduce((acc, c) => acc + Number(c.saldo), 0)

  return (
    <div>
      <h1 className="mb-4 font-display text-xl text-marca">Reporte de deuda</h1>

      <div className="mb-4 rounded-xl bg-marca p-4 text-white shadow-sm">
        <p className="text-xs text-white/70">Total adeudado</p>
        <p className="font-mono text-2xl">${totalAdeudado.toFixed(2)}</p>
      </div>

      {clientes.length === 0 ? (
        <p className="text-sm text-marca/50">Ningún cliente tiene saldo pendiente.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-marca/10 text-marca/50">
                <th className="p-3 font-medium">Cliente</th>
                <th className="p-3 font-medium">Saldo</th>
                <th className="p-3 font-medium">Teléfono</th>
                <th className="p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-marca/10">
              {clientes.map((c) => (
                <tr key={c.cliente_id}>
                  <td className="p-3 font-medium text-marca">{c.nombre}</td>
                  <td className="p-3 font-mono text-perdida">${Number(c.saldo).toFixed(2)}</td>
                  <td className="p-3 text-marca/70">{c.telefono || '—'}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        tamano="sm"
                        variante="confirmar"
                        disabled={!c.telefono}
                        title={!c.telefono ? 'Sin teléfono cargado' : undefined}
                        onClick={() => window.open(mensajeWhatsapp(c), '_blank')}
                      >
                        Enviar WhatsApp
                      </Button>
                      <Link
                        to={`/${rutaBase}/cuenta-corriente`}
                        state={{ clienteId: c.cliente_id }}
                        className="inline-flex items-center justify-center rounded-lg border border-marca/30 px-3 py-1.5 text-sm font-medium text-marca hover:bg-marca/5"
                      >
                        Ver cuenta corriente
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
