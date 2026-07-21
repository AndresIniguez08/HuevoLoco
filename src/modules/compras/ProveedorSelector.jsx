import { useEffect, useState } from 'react'
import { listarProveedores } from '../../lib/proveedores'

export default function ProveedorSelector({ proveedorId, onCambio }) {
  const [proveedores, setProveedores] = useState([])

  useEffect(() => {
    listarProveedores().then(setProveedores).catch(() => {})
  }, [])

  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-marca">Proveedor</span>
      <select
        value={proveedorId}
        onChange={(e) => onCambio(e.target.value)}
        className="rounded-lg border border-marca/20 px-3 py-2 outline-none focus:border-marca-claro"
      >
        <option value="">Elegir...</option>
        {proveedores.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nombre}
          </option>
        ))}
      </select>
    </label>
  )
}
