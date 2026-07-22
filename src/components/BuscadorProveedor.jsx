import { useEffect, useState } from 'react'
import { listarProveedores } from '../lib/proveedores'

export default function BuscadorProveedor({ onSeleccionar }) {
  const [texto, setTexto] = useState('')
  const [resultados, setResultados] = useState([])

  useEffect(() => {
    if (!texto) {
      setResultados([])
      return
    }
    const timeout = setTimeout(() => {
      listarProveedores({ texto }).then(setResultados).catch(() => {})
    }, 250)
    return () => clearTimeout(timeout)
  }, [texto])

  return (
    <div>
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Buscar proveedor por nombre"
        className="w-full rounded-lg border border-marca/20 px-3 py-2 outline-none focus:border-marca-claro"
      />
      {resultados.length > 0 && (
        <ul className="mt-2 divide-y divide-marca/10 rounded-lg border border-marca/10 bg-white">
          {resultados.map((p) => (
            <li
              key={p.id}
              className="cursor-pointer px-3 py-2 text-sm hover:bg-marca/5"
              onClick={() => {
                onSeleccionar(p)
                setTexto('')
                setResultados([])
              }}
            >
              {p.nombre}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
