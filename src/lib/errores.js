const PATRONES = [
  { test: /monto.*(negativo|mayor a cero|greater than)/i, mensaje: 'El monto tiene que ser mayor a cero.' },
  { test: /motivo.*(vac|null|required|empty)/i, mensaje: 'Tenés que indicar un motivo.' },
  { test: /stock.*(insuficiente|not enough|negative)/i, mensaje: 'No hay stock suficiente para esta operación.' },
  { test: /cantidad.*(negativ|mayor a cero|greater than)/i, mensaje: 'La cantidad tiene que ser mayor a cero.' },
  { test: /permission denied|rls|policy/i, mensaje: 'No tenés permiso para hacer esta acción.' },
  { test: /duplicate key/i, mensaje: 'Ese registro ya existe.' },
  { test: /violates foreign key/i, mensaje: 'Falta seleccionar un dato relacionado (cliente, producto o proveedor).' },
  { test: /jwt|not authenticated|invalid login/i, mensaje: 'Tu sesión expiró, iniciá sesión de nuevo.' },
  { test: /network|fetch/i, mensaje: 'No se pudo conectar. Revisá tu conexión e intentá de nuevo.' },
]

export function traducirError(error) {
  if (!error) return 'Ocurrió un error inesperado.'
  const mensajeOriginal = error.message || String(error)
  const encontrado = PATRONES.find((p) => p.test.test(mensajeOriginal))
  if (encontrado) return encontrado.mensaje
  return 'No se pudo completar la operación. Intentá de nuevo.'
}
