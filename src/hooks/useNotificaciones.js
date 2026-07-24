import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRefrescoPeriodico } from './useRefrescoPeriodico'

const SIN_DATOS = {}

// Centraliza TODOS los contadores de badges de la app en una sola consulta
// (fn_contadores_notificaciones), en vez de una query por badge — se llama
// una única vez arriba del todo (AppRouter) y el resultado se reparte por
// props a quien lo necesite. Reutiliza useRefrescoPeriodico (no usePolling)
// por la misma razón que en el resto de la app: usePolling guarda el
// callback en un array de dependencias vacío y queda con un closure viejo
// para siempre, mientras que useRefrescoPeriodico lo guarda en un ref.
export function useNotificaciones(activo = true) {
  const [contadores, setContadores] = useState(SIN_DATOS)

  useRefrescoPeriodico(
    async () => {
      const { data, error } = await supabase.rpc('fn_contadores_notificaciones').single()
      if (!error && data) setContadores(data)
    },
    { activo }
  )

  return contadores
}
