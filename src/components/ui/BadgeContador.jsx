export default function BadgeContador({ valor }) {
  if (!valor) return null
  return (
    <span className="rounded-full bg-perdida px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
      {valor}
    </span>
  )
}
