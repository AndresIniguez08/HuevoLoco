import RegistrarCompra from '../compras/RegistrarCompra'

// Depósito recibe mercadería con el mismo formulario y la misma llamada a
// fn_registrar_compra que usa Compras; solo cambia el título de contexto.
export default function RecepcionCompra() {
  return <RegistrarCompra titulo="Recepción de compra" />
}
