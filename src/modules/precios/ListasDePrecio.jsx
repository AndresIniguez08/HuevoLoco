import { useEffect, useState } from 'react'
import { listarListasPrecio, crearListaPrecio } from '../../lib/listasPrecio'
import { traducirError } from '../../lib/errores'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import EditorListaPrecio from './EditorListaPrecio'

export default function ListasDePrecio() {
  const [listas, setListas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [listaSeleccionada, setListaSeleccionada] = useState(null)

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setCargando(true)
    try {
      const data = await listarListasPrecio()
      setListas(data)
      setError(null)
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setCargando(false)
    }
  }

  if (listaSeleccionada) {
    return <EditorListaPrecio lista={listaSeleccionada} onCerrar={() => setListaSeleccionada(null)} />
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl text-marca">Listas de precio</h1>
        <Button onClick={() => setModalAbierto(true)}>Nueva lista</Button>
      </div>

      {error && <p className="mb-3 text-sm text-perdida">{error}</p>}

      <div className="rounded-xl bg-white shadow-sm">
        {cargando ? (
          <p className="p-4 text-sm text-marca/60">Cargando listas...</p>
        ) : listas.length === 0 ? (
          <p className="p-4 text-sm text-marca/50">Todavía no hay listas de precio.</p>
        ) : (
          <ul className="divide-y divide-marca/10">
            {listas.map((l) => (
              <li key={l.id}>
                <button
                  onClick={() => setListaSeleccionada(l)}
                  className="w-full p-4 text-left text-sm font-medium text-marca hover:bg-marca/5"
                >
                  {l.nombre}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ModalNuevaLista
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        onCreada={(lista) => {
          setModalAbierto(false)
          cargar()
          setListaSeleccionada(lista)
        }}
      />
    </div>
  )
}

function ModalNuevaLista({ abierto, onCerrar, onCreada }) {
  const [nombre, setNombre] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)

  async function crear() {
    if (!nombre.trim()) return
    setEnviando(true)
    setError(null)
    try {
      const lista = await crearListaPrecio(nombre.trim())
      setNombre('')
      onCreada(lista)
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Nueva lista de precios">
      <div className="flex flex-col gap-3">
        <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        {error && <p className="text-sm text-perdida">{error}</p>}
        <Button onClick={crear} cargando={enviando} className="w-full">
          Crear lista
        </Button>
      </div>
    </Modal>
  )
}
