import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { obtenerMovimientosCaja, totalesPorMedio, formatearDiferencia } from '../../lib/caja'
import { traducirError } from '../../lib/errores'
import { DENOMINACIONES_BILLETE } from '../../lib/constantes'
import { useAuthStore } from '../../stores/authStore'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

function lineaDiferencia(etiqueta, contado, esperado) {
  if (contado === '') return null
  const { texto, clase } = formatearDiferencia(Number(contado) - esperado)
  return (
    <p key={etiqueta} className={`font-mono text-sm ${clase}`}>
      {etiqueta}: {texto}
    </p>
  )
}

// `caja_arqueos` no es caja_movimientos, así que el insert directo desde el
// frontend es aceptable. `diferencia` la calcula la base (columna generada):
// no se envía en el insert, solo se muestra localmente como vista previa.
export default function Arqueo() {
  const usuario = useAuthStore((s) => s.usuario)
  const perfil = useAuthStore((s) => s.perfil)
  const [esperados, setEsperados] = useState({ efectivo: 0, mercado_pago: 0, transferencia: 0 })
  const [cantidadesBilletes, setCantidadesBilletes] = useState({})
  const [mpContado, setMpContado] = useState('')
  const [transferenciaContado, setTransferenciaContado] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const [arqueoGuardado, setArqueoGuardado] = useState(null)

  useEffect(() => {
    if (!perfil?.sucursal_id) return
    // Filtrado por sucursal_id de quien está haciendo el arqueo: con más de
    // una sucursal generando caja_movimientos, sin este filtro Central vería
    // plata que en realidad es de las sucursales (y viceversa).
    obtenerMovimientosCaja({ sucursalId: perfil.sucursal_id })
      .then((movimientos) => {
        const totales = totalesPorMedio(movimientos)
        setEsperados({
          efectivo: totales['efectivo'] || 0,
          mercado_pago: totales['mercado_pago'] || 0,
          transferencia: totales['transferencia'] || 0,
        })
      })
      .catch((e) => setError(traducirError(e)))
      .finally(() => setCargando(false))
  }, [perfil?.sucursal_id])

  const totalEfectivoContado = DENOMINACIONES_BILLETE.reduce(
    (acc, denom) => acc + denom * (Number(cantidadesBilletes[denom]) || 0),
    0
  )

  function marcarSinGuardar() {
    setArqueoGuardado(null)
  }

  function actualizarCantidad(denom, valor) {
    setCantidadesBilletes((prev) => ({ ...prev, [denom]: valor }))
    marcarSinGuardar()
  }

  const puedeGuardar = mpContado !== '' && transferenciaContado !== ''

  async function guardarArqueo() {
    setGuardando(true)
    setError(null)
    try {
      const detalleBilletes = Object.fromEntries(
        DENOMINACIONES_BILLETE.filter((denom) => (Number(cantidadesBilletes[denom]) || 0) > 0).map((denom) => [
          denom,
          Number(cantidadesBilletes[denom]),
        ])
      )
      const { data, error: errorInsert } = await supabase
        .from('caja_arqueos')
        .insert({
          usuario_id: usuario.id,
          sucursal_id: perfil.sucursal_id,
          fecha: new Date().toISOString().slice(0, 10),
          monto_esperado: esperados.efectivo,
          monto_contado: totalEfectivoContado,
          detalle_billetes: detalleBilletes,
          mp_esperado: esperados.mercado_pago,
          mp_contado: Number(mpContado),
          transferencia_esperado: esperados.transferencia,
          transferencia_contado: Number(transferenciaContado),
        })
        .select()
        .single()
      if (errorInsert) throw errorInsert
      setArqueoGuardado(data)
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) return <p className="text-marca/60">Cargando arqueo...</p>

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 font-display text-xl text-marca">Arqueo de caja</h1>
      <div className="flex flex-col gap-4 rounded-xl bg-white p-4 shadow-sm">
        <div>
          <p className="text-xs text-marca/50">Efectivo esperado según movimientos de hoy</p>
          <p className="font-mono text-2xl text-marca">${esperados.efectivo.toFixed(2)}</p>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-marca">Conteo de billetes</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-marca/50">
                  <th className="pb-1 font-medium">Denominación</th>
                  <th className="pb-1 font-medium">Cantidad</th>
                  <th className="pb-1 text-right font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-marca/10">
                {DENOMINACIONES_BILLETE.map((denom) => (
                  <tr key={denom}>
                    <td className="py-1.5 font-mono text-marca">${denom}</td>
                    <td className="py-1.5">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        value={cantidadesBilletes[denom] ?? ''}
                        onChange={(e) => actualizarCantidad(denom, e.target.value)}
                        className="w-20 rounded-lg border border-marca/20 px-2 py-1 font-mono outline-none focus:border-marca-claro"
                      />
                    </td>
                    <td className="py-1.5 text-right font-mono text-marca/70">
                      ${(denom * (Number(cantidadesBilletes[denom]) || 0)).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-right font-mono text-2xl text-marca">${totalEfectivoContado.toFixed(2)}</p>
        </div>

        <div className="rounded-lg border border-marca/10 p-3">
          <p className="mb-2 text-sm font-medium text-marca">Mercado Pago</p>
          <p className="mb-2 text-xs text-marca/50">
            Esperado según movimientos de hoy: ${esperados.mercado_pago.toFixed(2)}
          </p>
          <Input
            label="Contado / verificado"
            tipo="number"
            numerico
            min="0"
            step="0.01"
            value={mpContado}
            onChange={(e) => {
              setMpContado(e.target.value)
              marcarSinGuardar()
            }}
          />
        </div>

        <div className="rounded-lg border border-marca/10 p-3">
          <p className="mb-2 text-sm font-medium text-marca">Transferencia</p>
          <p className="mb-2 text-xs text-marca/50">
            Esperado según movimientos de hoy: ${esperados.transferencia.toFixed(2)}
          </p>
          <Input
            label="Contado / verificado"
            tipo="number"
            numerico
            min="0"
            step="0.01"
            value={transferenciaContado}
            onChange={(e) => {
              setTransferenciaContado(e.target.value)
              marcarSinGuardar()
            }}
          />
        </div>

        <div>
          <p className="mb-1 text-sm font-medium text-marca">Resultado</p>
          <div className="flex flex-col gap-1">
            {lineaDiferencia('Efectivo', String(totalEfectivoContado), esperados.efectivo)}
            {lineaDiferencia('Mercado Pago', mpContado, esperados.mercado_pago)}
            {lineaDiferencia('Transferencia', transferenciaContado, esperados.transferencia)}
          </div>
          {puedeGuardar &&
            (() => {
              const { texto, clase } = formatearDiferencia(
                totalEfectivoContado -
                  esperados.efectivo +
                  (Number(mpContado) - esperados.mercado_pago) +
                  (Number(transferenciaContado) - esperados.transferencia)
              )
              return (
                <p className={`mt-2 border-t border-marca/10 pt-2 font-mono text-base font-medium ${clase}`}>
                  Diferencia total: {texto}
                </p>
              )
            })()}
        </div>

        {error && <p className="text-sm text-perdida">{error}</p>}
        {arqueoGuardado && <p className="text-sm text-fresco">Arqueo guardado.</p>}

        <div className="flex gap-2">
          <Button onClick={guardarArqueo} disabled={!puedeGuardar} cargando={guardando} className="flex-1">
            Guardar arqueo
          </Button>
          {arqueoGuardado && (
            <Button
              variante="secundario"
              className="flex-1"
              onClick={() => window.open(`/arqueo/${arqueoGuardado.id}/imprimir`, '_blank')}
            >
              Imprimir arqueo
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
