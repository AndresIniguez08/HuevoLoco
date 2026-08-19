import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { Upload, CheckCircle, AlertTriangle, Ban, RotateCcw } from 'lucide-react'
import {
  obtenerClientesParaValidacionImportacion,
  crearClientesMasivo,
} from '../../lib/clientes'
import { obtenerListaPrecioPorNombre } from '../../lib/listasPrecio'
import { listarSucursales } from '../../lib/transferencias'
import { traducirError } from '../../lib/errores'
import BotonVolverInicio from '../../components/BotonVolverInicio'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'

const PASOS = { SUBIR: 'subir', MAPEAR: 'mapear', PREVISUALIZAR: 'previsualizar', RESULTADO: 'resultado' }

const CAMPOS_MAPEO = [
  { clave: 'nombre', etiqueta: 'Nombre', obligatorio: true, alias: ['nombre', 'name'] },
  { clave: 'telefono', etiqueta: 'Teléfono', obligatorio: false, alias: ['telefono', 'teléfono', 'tel', 'celular'] },
  { clave: 'direccion', etiqueta: 'Dirección', obligatorio: false, alias: ['direccion', 'dirección', 'domicilio'] },
  { clave: 'email', etiqueta: 'Email', obligatorio: false, alias: ['email', 'mail', 'correo'] },
]

// Formatos mezclados en la planilla real ('1135028909', '112354-9912', '11
// 4406-9010') — se comparan solo los dígitos, tanto del archivo como de lo
// que ya está en la base.
function normalizarTelefono(valor) {
  return String(valor ?? '').replace(/\D/g, '')
}

// Ordena las palabras del nombre para que "Cuello Javier" y "Javier Cuello"
// den la misma clave — es una alerta de posible duplicado, no un bloqueo.
function normalizarNombre(valor) {
  return String(valor ?? '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ')
}

function adivinarMapeo(encabezados) {
  const buscar = (alias) => encabezados.find((h) => alias.includes(String(h).trim().toLowerCase())) || ''
  return Object.fromEntries(CAMPOS_MAPEO.map((c) => [c.clave, buscar(c.alias)]))
}

// Cruza las filas del archivo (ya mapeadas a nombre/telefono/direccion/email)
// contra los clientes existentes y entre sí, y arma el objeto que consume la
// previsualización. Filas sin nombre no entran acá — se cuentan aparte.
function validarFilas(filasCrudas, mapeo, clientesExistentes) {
  const filasBase = []
  let omitidasSinNombre = 0

  filasCrudas.forEach((filaCruda, idx) => {
    const nombre = mapeo.nombre ? String(filaCruda[mapeo.nombre] ?? '').trim() : ''
    if (!nombre) {
      omitidasSinNombre += 1
      return
    }
    const telefono = mapeo.telefono ? String(filaCruda[mapeo.telefono] ?? '').trim() : ''
    const direccion = mapeo.direccion ? String(filaCruda[mapeo.direccion] ?? '').trim() : ''
    const email = mapeo.email ? String(filaCruda[mapeo.email] ?? '').trim() : ''
    filasBase.push({
      idx,
      nombre,
      telefono,
      direccion,
      email,
      telefonoNorm: normalizarTelefono(telefono),
      nombreNorm: normalizarNombre(nombre),
    })
  })

  const existentesPorTelefono = new Map()
  const existentesPorNombre = new Map()
  for (const c of clientesExistentes) {
    const tNorm = normalizarTelefono(c.telefono)
    if (tNorm && !existentesPorTelefono.has(tNorm)) existentesPorTelefono.set(tNorm, c)
    const nNorm = normalizarNombre(c.nombre)
    if (nNorm && !existentesPorNombre.has(nNorm)) existentesPorNombre.set(nNorm, c)
  }

  const archivoPorTelefono = new Map()
  for (const f of filasBase) {
    if (!f.telefonoNorm) continue
    if (!archivoPorTelefono.has(f.telefonoNorm)) archivoPorTelefono.set(f.telefonoNorm, [])
    archivoPorTelefono.get(f.telefonoNorm).push(f)
  }

  const filas = filasBase.map((f) => {
    let duplicado_telefono = false
    let refTelefono = null

    if (f.telefonoNorm) {
      const existente = existentesPorTelefono.get(f.telefonoNorm)
      if (existente) {
        duplicado_telefono = true
        refTelefono = `Ya existe en la base: "${existente.nombre}"`
      } else {
        const otras = archivoPorTelefono.get(f.telefonoNorm).filter((o) => o.idx !== f.idx)
        if (otras.length > 0) {
          duplicado_telefono = true
          refTelefono = `Mismo teléfono que "${otras[0].nombre}" en este archivo`
        }
      }
    }

    const existenteNombre = existentesPorNombre.get(f.nombreNorm)
    const posible_duplicado_nombre = !!existenteNombre
    const refNombre = existenteNombre ? existenteNombre.nombre : null

    return {
      ...f,
      duplicado_telefono,
      refTelefono,
      posible_duplicado_nombre,
      refNombre,
      // Bloqueado por default cuando hay coincidencia de teléfono O de
      // nombre — el usuario tiene que confirmarlo a mano fila por fila si
      // igual quiere importarla (ej. dos locales del mismo dueño con el
      // mismo teléfono, o dos personas distintas que comparten nombre).
      importar: !duplicado_telefono && !posible_duplicado_nombre,
    }
  })

  return { filas, omitidasSinNombre }
}

// Motivo legible para una fila bloqueada, sea por teléfono o por nombre —
// usado tanto en la previsualización como en el resumen final.
function motivoOmision(f) {
  if (f.duplicado_telefono) return f.refTelefono
  if (f.posible_duplicado_nombre) return `Nombre parecido a "${f.refNombre}" ya existente`
  return null
}

export default function ImportarClientes() {
  const [paso, setPaso] = useState(PASOS.SUBIR)

  const [clientesExistentes, setClientesExistentes] = useState([])
  const [listaMayoristaId, setListaMayoristaId] = useState(null)
  const [casaCentralId, setCasaCentralId] = useState(null)
  const [cargandoInicial, setCargandoInicial] = useState(true)
  const [errorInicial, setErrorInicial] = useState(null)

  const [archivoNombre, setArchivoNombre] = useState('')
  const [filasCrudas, setFilasCrudas] = useState([])
  const [encabezados, setEncabezados] = useState([])
  const [errorArchivo, setErrorArchivo] = useState(null)
  const [cargandoArchivo, setCargandoArchivo] = useState(false)

  const [mapeo, setMapeo] = useState({ nombre: '', telefono: '', direccion: '', email: '' })

  const [filasPrevia, setFilasPrevia] = useState([])
  const [omitidasSinNombre, setOmitidasSinNombre] = useState(0)

  const [importando, setImportando] = useState(false)
  const [errorImportar, setErrorImportar] = useState(null)
  const [resultado, setResultado] = useState(null)

  // Se trae una sola vez al entrar a la pantalla: clientes existentes (para
  // cruzar duplicados) + lista MAYORISTA y Casa Central (para armar el
  // insert). Si algo de esto falla no tiene sentido dejar avanzar el resto
  // del flujo, así que se corta acá con un error de pantalla completa.
  useEffect(() => {
    Promise.all([obtenerClientesParaValidacionImportacion(), obtenerListaPrecioPorNombre('Lista MAYORISTA'), listarSucursales()])
      .then(([clientes, listaId, sucursales]) => {
        setClientesExistentes(clientes)
        setListaMayoristaId(listaId)
        setCasaCentralId(sucursales.find((s) => s.nombre === 'Casa Central')?.id || null)
      })
      .catch((e) => setErrorInicial(traducirError(e)))
      .finally(() => setCargandoInicial(false))
  }, [])

  async function manejarArchivo(e) {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    setErrorArchivo(null)
    setCargandoArchivo(true)
    try {
      const buffer = await archivo.arrayBuffer()
      const workbook = XLSX.read(buffer)
      const hoja = workbook.Sheets[workbook.SheetNames[0]]
      const filas = XLSX.utils.sheet_to_json(hoja, { defval: '' })
      if (filas.length === 0) throw new Error('vacio')
      const encabezadosArchivo = Object.keys(filas[0])
      setFilasCrudas(filas)
      setEncabezados(encabezadosArchivo)
      setMapeo(adivinarMapeo(encabezadosArchivo))
      setArchivoNombre(archivo.name)
      setPaso(PASOS.MAPEAR)
    } catch {
      setErrorArchivo('No se pudo leer el archivo. Verificá que sea un .xlsx o .csv válido, con al menos una fila de datos.')
    } finally {
      setCargandoArchivo(false)
      e.target.value = ''
    }
  }

  function confirmarMapeo() {
    const { filas, omitidasSinNombre: omitidas } = validarFilas(filasCrudas, mapeo, clientesExistentes)
    setFilasPrevia(filas)
    setOmitidasSinNombre(omitidas)
    setPaso(PASOS.PREVISUALIZAR)
  }

  function alternarImportar(idx) {
    setFilasPrevia((prev) => prev.map((f) => (f.idx === idx ? { ...f, importar: !f.importar } : f)))
  }

  const rojas = useMemo(() => filasPrevia.filter((f) => f.duplicado_telefono), [filasPrevia])
  const amarillas = useMemo(
    () => filasPrevia.filter((f) => !f.duplicado_telefono && f.posible_duplicado_nombre),
    [filasPrevia]
  )
  const verdes = useMemo(
    () => filasPrevia.filter((f) => !f.duplicado_telefono && !f.posible_duplicado_nombre),
    [filasPrevia]
  )
  const aImportar = useMemo(() => filasPrevia.filter((f) => f.importar), [filasPrevia])
  // Un solo contador de omitidos: teléfono duplicado y nombre parecido se
  // bloquean con el mismo checkbox "Importar igual", así que se suman en vez
  // de mostrarse por separado en el botón.
  const omitidasPorDuplicado = filasPrevia.filter((f) => !f.importar).length

  async function confirmarImportacion() {
    setImportando(true)
    setErrorImportar(null)
    try {
      const filasParaInsertar = aImportar.map((f) => ({
        nombre: f.nombre,
        telefono: f.telefono || null,
        direccion: f.direccion || null,
        email: f.email || null,
        sucursal_id: casaCentralId,
        tipo: 'mayorista',
        lista_precio_id: listaMayoristaId,
        cuenta_corriente_autorizada: false,
        activo: true,
      }))
      const creados = filasParaInsertar.length > 0 ? await crearClientesMasivo(filasParaInsertar) : []
      setResultado({
        importados: creados.length,
        omitidosPorDuplicado: filasPrevia.filter((f) => !f.importar),
        omitidasSinNombre,
      })
      setPaso(PASOS.RESULTADO)
    } catch (e) {
      setErrorImportar(traducirError(e))
    } finally {
      setImportando(false)
    }
  }

  function empezarDeNuevo() {
    setArchivoNombre('')
    setFilasCrudas([])
    setEncabezados([])
    setMapeo({ nombre: '', telefono: '', direccion: '', email: '' })
    setFilasPrevia([])
    setOmitidasSinNombre(0)
    setErrorImportar(null)
    setResultado(null)
    setPaso(PASOS.SUBIR)
  }

  if (cargandoInicial) return <p className="p-6 text-center text-marca/60">Cargando...</p>
  if (errorInicial) return <p className="p-6 text-center text-perdida">{errorInicial}</p>

  return (
    <div className="mx-auto max-w-3xl">
      <BotonVolverInicio />
      <h1 className="mb-4 font-display text-xl text-marca">Importar clientes desde Excel</h1>

      {paso === PASOS.SUBIR && (
        <div className="flex flex-col items-center gap-4 rounded-xl bg-white p-10 text-center shadow-sm">
          <Upload size={36} className="text-marca-claro" />
          <div>
            <p className="text-base font-medium text-marca">Subí un archivo .xlsx o .csv</p>
            <p className="mt-1 text-sm text-marca/50">
              La planilla debe tener al menos una columna con el nombre del cliente.
            </p>
          </div>
          <label className="cursor-pointer rounded-lg bg-marca px-5 py-2.5 text-sm font-medium text-white hover:bg-marca/90">
            {cargandoArchivo ? 'Leyendo...' : 'Elegir archivo'}
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={manejarArchivo}
              disabled={cargandoArchivo}
              className="hidden"
            />
          </label>
          {errorArchivo && <p className="text-sm text-perdida">{errorArchivo}</p>}
        </div>
      )}

      {paso === PASOS.MAPEAR && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-sm text-marca/50">
              Archivo: <span className="font-medium text-marca">{archivoNombre}</span> · {filasCrudas.length} filas ·{' '}
              {encabezados.length} columnas detectadas
            </p>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-medium text-marca">Mapeo de columnas</p>
            <div className="flex flex-col gap-3">
              {CAMPOS_MAPEO.map((campo) => (
                <label key={campo.clave} className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-marca">
                    {campo.etiqueta}
                    {campo.obligatorio && <span className="text-perdida"> *</span>}
                  </span>
                  <select
                    value={mapeo[campo.clave]}
                    onChange={(e) => setMapeo((prev) => ({ ...prev, [campo.clave]: e.target.value }))}
                    className="rounded-lg border border-marca/20 px-3 py-2 outline-none focus:border-marca-claro"
                  >
                    <option value="">{campo.obligatorio ? 'Elegí una columna...' : 'Ninguna'}</option>
                    {encabezados.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>

          {filasCrudas.length > 0 && (
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="mb-2 text-sm font-medium text-marca">Vista previa (primeras 3 filas del archivo)</p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-marca/50">
                      {encabezados.map((h) => (
                        <th key={h} className="pb-1 pr-4 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-marca/10">
                    {filasCrudas.slice(0, 3).map((fila, i) => (
                      <tr key={i}>
                        {encabezados.map((h) => (
                          <td key={h} className="py-1.5 pr-4 text-marca/80">
                            {String(fila[h])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button variante="secundario" className="flex-1" onClick={empezarDeNuevo}>
              Cancelar
            </Button>
            <Button className="flex-1" disabled={!mapeo.nombre} onClick={confirmarMapeo}>
              Continuar
            </Button>
          </div>
        </div>
      )}

      {paso === PASOS.PREVISUALIZAR && (
        <div className="flex flex-col gap-4">
          {rojas.length > 0 && (
            <div className="rounded-xl border border-perdida/30 bg-perdida/5 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Ban size={18} className="text-perdida" />
                <p className="text-sm font-medium text-perdida">Bloqueados por teléfono duplicado ({rojas.length})</p>
              </div>
              <ul className="flex flex-col gap-2">
                {rojas.map((f) => (
                  <li key={f.idx} className="flex items-center justify-between gap-3 rounded-lg bg-white p-3 shadow-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-marca">{f.nombre}</p>
                      <p className="text-xs text-marca/50">{f.telefono || 'Sin teléfono'}</p>
                      <p className="mt-0.5 text-xs text-perdida">{f.refTelefono}</p>
                    </div>
                    <label className="flex shrink-0 items-center gap-2 text-xs font-medium text-marca">
                      <input type="checkbox" checked={f.importar} onChange={() => alternarImportar(f.idx)} />
                      Importar igual
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {amarillas.length > 0 && (
            <div className="rounded-xl border border-yema/30 bg-yema/5 p-4">
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle size={18} className="text-yema" />
                <p className="text-sm font-medium text-yema">Nombre parecido a uno existente ({amarillas.length})</p>
              </div>
              <ul className="flex flex-col gap-2">
                {amarillas.map((f) => (
                  <li key={f.idx} className="flex items-center justify-between gap-3 rounded-lg bg-white p-3 shadow-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-marca">{f.nombre}</p>
                      <p className="text-xs text-marca/50">{f.telefono || 'Sin teléfono'}</p>
                      <p className="mt-0.5 text-xs text-yema">Ya existe como "{f.refNombre}"</p>
                    </div>
                    <label className="flex shrink-0 items-center gap-2 text-xs font-medium text-marca">
                      <input type="checkbox" checked={f.importar} onChange={() => alternarImportar(f.idx)} />
                      Importar igual
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-xl border border-fresco/30 bg-fresco/5 p-4">
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle size={18} className="text-fresco" />
              <p className="text-sm font-medium text-fresco">Para importar sin problema ({verdes.length})</p>
            </div>
            {verdes.length === 0 ? (
              <p className="text-xs text-marca/50">Ninguna fila en este grupo.</p>
            ) : (
              <ul className="divide-y divide-marca/10">
                {verdes.map((f) => (
                  <li key={f.idx} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                    <span className="text-marca">{f.nombre}</span>
                    <span className="font-mono text-xs text-marca/50">{f.telefono || '—'}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {omitidasSinNombre > 0 && (
            <p className="text-center text-xs text-marca/50">
              {omitidasSinNombre} fila{omitidasSinNombre === 1 ? '' : 's'} del archivo se descarta
              {omitidasSinNombre === 1 ? '' : 'n'} por no tener nombre.
            </p>
          )}

          {errorImportar && <p className="text-center text-sm text-perdida">{errorImportar}</p>}

          <div className="flex gap-2">
            <Button variante="secundario" className="flex-1" onClick={() => setPaso(PASOS.MAPEAR)}>
              Volver a mapear
            </Button>
            <Button
              variante="confirmar"
              className="flex-1"
              disabled={aImportar.length === 0}
              cargando={importando}
              onClick={confirmarImportacion}
            >
              Importar {aImportar.length} cliente{aImportar.length === 1 ? '' : 's'}
              {omitidasPorDuplicado > 0
                ? ` (${omitidasPorDuplicado} omitido${omitidasPorDuplicado === 1 ? '' : 's'} por posible duplicado)`
                : ''}
            </Button>
          </div>
        </div>
      )}

      {paso === PASOS.RESULTADO && resultado && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-2 rounded-xl bg-white p-8 text-center shadow-sm">
            <CheckCircle size={36} className="text-fresco" />
            <p className="text-lg font-medium text-marca">
              {resultado.importados} cliente{resultado.importados === 1 ? '' : 's'} importado
              {resultado.importados === 1 ? '' : 's'} con éxito
            </p>
          </div>

          {resultado.omitidosPorDuplicado.length > 0 && (
            <div className="rounded-xl border border-perdida/30 bg-perdida/5 p-4">
              <p className="mb-2 text-sm font-medium text-perdida">
                Omitidos por posible duplicado ({resultado.omitidosPorDuplicado.length})
              </p>
              <ul className="flex flex-col gap-1">
                {resultado.omitidosPorDuplicado.map((f) => (
                  <li key={f.idx} className="text-sm text-marca/70">
                    <span className="font-medium text-marca">{f.nombre}</span> — {motivoOmision(f)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {resultado.omitidasSinNombre > 0 && (
            <div className="rounded-xl border border-marca/10 bg-white p-4">
              <Badge tono="neutro">
                {resultado.omitidasSinNombre} fila{resultado.omitidasSinNombre === 1 ? '' : 's'} omitida
                {resultado.omitidasSinNombre === 1 ? '' : 's'} por falta de nombre
              </Badge>
            </div>
          )}

          <Button className="w-full" onClick={empezarDeNuevo}>
            <RotateCcw size={16} /> Importar otro archivo
          </Button>
        </div>
      )}
    </div>
  )
}
