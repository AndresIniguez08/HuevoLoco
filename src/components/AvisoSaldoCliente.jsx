export default function AvisoSaldoCliente({ nombre, saldo, desde, className = '' }) {
  if (!(saldo > 0)) return null

  return (
    <p className={`rounded-lg border border-yema/30 bg-yema/10 p-3 text-sm text-marca ${className}`}>
      El cliente <span className="font-medium">{nombre}</span> tiene un saldo pendiente de{' '}
      <span className="font-mono font-medium text-yema">${Number(saldo).toFixed(2)}</span>
      {desde && (
        <>
          {' '}
          desde el <span className="font-medium">{new Date(desde).toLocaleDateString('es-AR')}</span>
        </>
      )}
      .
    </p>
  )
}
