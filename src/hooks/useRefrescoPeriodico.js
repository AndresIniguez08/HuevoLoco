import { useEffect, useRef } from 'react'

// Repite `accion` cada `intervaloMs` mientras `activo` sea true, y además la
// dispara al volver a la pestaña (visibilitychange) — cubre el caso típico
// de alguien que cambió de pestaña/app y volvió con datos ya desactualizados
// (badges del sidebar, entregas de VistaChofer, remitos de AceptarMercaderia).
// `accion` se guarda en un ref para que cambiar de identidad en cada render
// no reinicie el interval; solo `activo`/`intervaloMs` lo reinician.
export function useRefrescoPeriodico(accion, { activo = true, intervaloMs = 30000, inicial = true } = {}) {
  const accionRef = useRef(accion)
  useEffect(() => {
    accionRef.current = accion
  })

  useEffect(() => {
    if (!activo) return
    function disparar() {
      accionRef.current()
    }
    function alVolverVisible() {
      if (document.visibilityState === 'visible') disparar()
    }
    if (inicial) disparar()
    const intervalo = setInterval(disparar, intervaloMs)
    document.addEventListener('visibilitychange', alVolverVisible)
    return () => {
      clearInterval(intervalo)
      document.removeEventListener('visibilitychange', alVolverVisible)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, intervaloMs, inicial])
}
