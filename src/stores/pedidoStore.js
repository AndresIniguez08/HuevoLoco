import { create } from 'zustand'

const estadoInicial = {
  cliente: null,
  items: [],
}

export const usePedidoStore = create((set, get) => ({
  ...estadoInicial,

  setCliente(cliente) {
    set({ cliente })
  },

  agregarItem(item) {
    set({ items: [...get().items, { ...item, id: crypto.randomUUID() }] })
  },

  quitarItem(id) {
    set({ items: get().items.filter((it) => it.id !== id) })
  },

  actualizarItem(id, cambios) {
    set({
      items: get().items.map((it) => (it.id === id ? { ...it, ...cambios } : it)),
    })
  },

  limpiar() {
    set({ ...estadoInicial, items: [] })
  },

  total() {
    return get().items.reduce((acc, it) => acc + it.subtotal, 0)
  },
}))
