import { useEffect, useState } from 'react'
import { buscarClientes } from '../lib/clientes'

// mostrarFiltroInactivos: solo lo usan pantallas de gestión (ej. edición de
// clientes) que necesitan poder encontrar y reactivar un cliente inactivo.
// refrescar: token opcional (ej. un contador) para forzar un refetch — p.ej.
// tras dar de alta un cliente nuevo — sin tocar ni resetear texto/filtro.
export default function BuscadorCliente({ onSeleccionar, mostrarFiltroInactivos = false, refrescar }) {
  const [texto, setTexto] = useState('')
  const [incluirInactivos, setIncluirInactivos] = useState(false)
  const [resultados, setResultados] = useState([])

  // Sin texto trae los primeros 20 por nombre (ver buscarClientes): así la
  // lista no arranca vacía, y a medida que se escribe se va filtrando igual.
  useEffect(() => {
    const timeout = setTimeout(() => {
      buscarClientes(texto, { incluirInactivos }).then(setResultados).catch(() => {})
    }, 250)
    return () => clearTimeout(timeout)
  }, [texto, incluirInactivos, refrescar])

  return (
    <div>
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Buscar cliente por nombre"
        className="w-full rounded-lg border border-marca/20 px-3 py-2 outline-none focus:border-marca-claro"
      />
      {mostrarFiltroInactivos && (
        <label className="mt-2 flex items-center gap-2 text-xs text-marca/70">
          <input
            type="checkbox"
            className="accent-marca"
            checked={incluirInactivos}
            onChange={(e) => setIncluirInactivos(e.target.checked)}
          />
          Mostrar inactivos
        </label>
      )}
      {resultados.length > 0 && (
        <ul className="mt-2 divide-y divide-marca/10 rounded-lg border border-marca/10 bg-white">
          {resultados.map((c) => (
            <li
              key={c.id}
              className="cursor-pointer px-3 py-2 text-sm hover:bg-marca/5"
              onClick={() => {
                onSeleccionar(c)
                setTexto('')
                setResultados([])
              }}
            >
              {c.nombre}
              {!c.activo && <span className="ml-2 text-xs text-perdida">(inactivo)</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
