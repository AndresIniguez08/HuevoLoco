import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { ChevronRight, LogOut, Menu, User, X } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { ETIQUETA_ROL } from '../lib/constantes'

function coincideRuta(pathname, to, end) {
  return end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`)
}

function grupoContieneRuta(grupo, pathname) {
  return grupo.items.some((item) => coincideRuta(pathname, item.to, item.end))
}

function sumaContadores(grupo) {
  return grupo.items.reduce((acc, item) => acc + (item.contador || 0), 0)
}

function BadgeContador({ valor }) {
  if (!valor) return null
  return (
    <span className="rounded-full bg-perdida px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
      {valor}
    </span>
  )
}

const CLASE_ITEM = ({ isActive }) =>
  `flex items-center gap-2 rounded-lg border-l-4 px-3 py-2 text-sm transition-colors ${
    isActive
      ? 'border-marca bg-yema/15 font-medium text-marca'
      : 'border-transparent text-marca/60 hover:bg-marca/5 hover:text-marca'
  }`

export default function AppShell({ titulo, navegacion }) {
  const perfil = useAuthStore((s) => s.perfil)
  const cerrarSesion = useAuthStore((s) => s.cerrarSesion)
  const location = useLocation()

  const [gruposAbiertos, setGruposAbiertos] = useState(
    () => new Set(navegacion.filter((n) => n.grupo && grupoContieneRuta(n, location.pathname)).map((n) => n.grupo))
  )
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false)
  const [menuUsuarioAbierto, setMenuUsuarioAbierto] = useState(false)

  // Al entrar a cualquier pantalla de un grupo, ese grupo arranca expandido.
  // Solo agrega el grupo activo al set — no toca los que el usuario ya
  // colapsó manualmente en esta misma pantalla.
  useEffect(() => {
    const grupoActivo = navegacion.find((n) => n.grupo && grupoContieneRuta(n, location.pathname))
    if (!grupoActivo) return
    setGruposAbiertos((prev) => (prev.has(grupoActivo.grupo) ? prev : new Set(prev).add(grupoActivo.grupo)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  // El drawer de mobile se cierra solo al navegar a otra pantalla.
  useEffect(() => {
    setMenuMovilAbierto(false)
  }, [location.pathname])

  function alternarGrupo(nombre) {
    setGruposAbiertos((prev) => {
      const siguiente = new Set(prev)
      if (siguiente.has(nombre)) siguiente.delete(nombre)
      else siguiente.add(nombre)
      return siguiente
    })
  }

  function cerrarMenuMovil() {
    setMenuMovilAbierto(false)
  }

  return (
    <div className="flex min-h-screen bg-fondo">
      {menuMovilAbierto && (
        <div className="fixed inset-0 z-40 bg-marca/40 md:hidden" onClick={cerrarMenuMovil} aria-hidden="true" />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-shrink-0 flex-col border-r border-marca/10 bg-white transition-transform duration-200 md:relative md:z-auto md:w-60 md:translate-x-0 ${
          menuMovilAbierto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-marca/10 px-4 py-4">
          <div>
            <p className="font-display text-lg leading-none text-marca">Huevo Loco</p>
            <p className="mt-0.5 text-xs text-marca/40">{titulo}</p>
          </div>
          <button
            onClick={cerrarMenuMovil}
            aria-label="Cerrar menú"
            className="rounded-full p-1 text-marca/60 hover:bg-marca/5 md:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          {navegacion.map((nodo) =>
            nodo.grupo ? (
              <div key={nodo.grupo} className="mb-1">
                <button
                  onClick={() => alternarGrupo(nodo.grupo)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-marca/70 hover:bg-marca/5 hover:text-marca"
                >
                  <nodo.icono size={16} />
                  <span className="flex-1 text-left">{nodo.grupo}</span>
                  <BadgeContador valor={sumaContadores(nodo)} />
                  <ChevronRight
                    size={14}
                    className={`transition-transform ${gruposAbiertos.has(nodo.grupo) ? 'rotate-90' : ''}`}
                  />
                </button>
                {gruposAbiertos.has(nodo.grupo) && (
                  <div className="ml-2 flex flex-col gap-0.5 border-l border-marca/10 py-1 pl-3">
                    {nodo.items.map((item) => (
                      <NavLink key={item.to} to={item.to} end={item.end} className={CLASE_ITEM} onClick={cerrarMenuMovil}>
                        <span className="flex-1">{item.label}</span>
                        <BadgeContador valor={item.contador} />
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <NavLink key={nodo.to} to={nodo.to} end={nodo.end} className={CLASE_ITEM} onClick={cerrarMenuMovil}>
                {nodo.icono && <nodo.icono size={16} />}
                <span className="flex-1">{nodo.label}</span>
                <BadgeContador valor={nodo.contador} />
              </NavLink>
            )
          )}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-marca/10 bg-white px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMenuMovilAbierto(true)}
              aria-label="Abrir menú"
              className="rounded-lg p-1.5 text-marca hover:bg-marca/5"
            >
              <Menu size={22} />
            </button>
            <p className="font-display text-base leading-none text-marca">Huevo Loco</p>
          </div>

          <div className="relative">
            <button
              onClick={() => setMenuUsuarioAbierto((v) => !v)}
              aria-label="Cuenta"
              className="rounded-full p-1.5 text-marca hover:bg-marca/5"
            >
              <User size={22} />
            </button>
            {menuUsuarioAbierto && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuUsuarioAbierto(false)} aria-hidden="true" />
                <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-marca/10 bg-white p-2 shadow-lg">
                  <p className="truncate px-2 py-1 text-sm font-medium text-marca">{perfil?.nombre}</p>
                  <p className="px-2 pb-2 text-xs text-marca/40">{ETIQUETA_ROL[perfil?.rol] || perfil?.rol}</p>
                  <button
                    onClick={cerrarSesion}
                    className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm text-marca/70 hover:bg-marca/5 hover:text-marca"
                  >
                    <LogOut size={16} />
                    Salir
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <header className="hidden items-center justify-end gap-3 border-b border-marca/10 bg-white px-6 py-3 md:flex">
          <span className="text-sm text-marca/70">
            {perfil?.nombre}
            <span className="text-marca/40"> · {ETIQUETA_ROL[perfil?.rol] || perfil?.rol}</span>
          </span>
          <button
            onClick={cerrarSesion}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-marca/70 hover:bg-marca/5 hover:text-marca"
          >
            <LogOut size={16} />
            Salir
          </button>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
