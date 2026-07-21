import { useEffect } from 'react'
import { useAuthStore } from './stores/authStore'
import { supabaseConfigurado } from './lib/supabase'
import AppRouter from './routes/AppRouter'

function App() {
  const inicializar = useAuthStore((s) => s.inicializar)

  useEffect(() => {
    if (supabaseConfigurado) inicializar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!supabaseConfigurado) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-fondo px-4 text-center">
        <div>
          <h1 className="mb-2 font-display text-xl text-marca">Falta configurar Supabase</h1>
          <p className="text-sm text-marca/60">
            Completá VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el archivo .env y reiniciá el servidor.
          </p>
        </div>
      </div>
    )
  }

  return <AppRouter />
}

export default App
