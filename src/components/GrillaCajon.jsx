// Grilla 2x6 que representa el stock real (en maples) módulo 12: cuánto
// falta para completar el próximo cajón. No es decorativa.
export default function GrillaCajon({ stockMaple, className = '' }) {
  const celdasLlenas = ((Number(stockMaple) || 0) % 12 + 12) % 12
  const celdas = Array.from({ length: 12 }, (_, i) => i < celdasLlenas)

  return (
    <div className={`grid grid-cols-6 grid-rows-2 gap-1.5 ${className}`}>
      {celdas.map((llena, i) => (
        <span
          key={i}
          className={
            llena
              ? 'h-3.5 w-3.5 rounded-full bg-yema'
              : 'h-3.5 w-3.5 rounded-full border border-dashed border-marca/20'
          }
        />
      ))}
    </div>
  )
}
