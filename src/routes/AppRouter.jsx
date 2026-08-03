import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Package, ShoppingCart, Users, Truck, PackageSearch, Tag, Wallet, Egg, Settings, Receipt } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { ROLES, RUTA_RAIZ_POR_ROL } from '../lib/constantes'
import { contarComprasPendientesCosteo } from '../lib/compras'
import { useNotificaciones } from '../hooks/useNotificaciones'
import { useRefrescoPeriodico } from '../hooks/useRefrescoPeriodico'
import RutaProtegida from '../components/RutaProtegida'
import AppShell from '../components/AppShell'
import Login from '../modules/auth/Login'
import DashboardDueno from '../modules/dashboard/DashboardDueno'
import StockGeneral from '../modules/stock/StockGeneral'
import ReporteStock from '../modules/stock/ReporteStock'
import ConteoStock from '../modules/stock/ConteoStock'
import DetalleConteo from '../modules/stock/DetalleConteo'
import ImprimirConteo from '../modules/stock/ImprimirConteo'
import AuditoriasConteo from '../modules/stock/AuditoriasConteo'
import RegistrarPerdida from '../modules/stock/RegistrarPerdida'
import RecepcionCompra from '../modules/stock/RecepcionCompra'
import TomarPedido from '../modules/ventas/TomarPedido'
import ListaPedidos from '../modules/ventas/ListaPedidos'
import AprobarPrecioEspecial from '../modules/ventas/AprobarPrecioEspecial'
import HistorialPreciosEspeciales from '../modules/ventas/HistorialPreciosEspeciales'
import GestionClientes from '../modules/clientes/GestionClientes'
import CuentaCorriente from '../modules/clientes/CuentaCorriente'
import CajaDiaria from '../modules/caja/CajaDiaria'
import Arqueo from '../modules/caja/Arqueo'
import ImprimirArqueo from '../modules/caja/ImprimirArqueo'
import HistorialMovimientos from '../modules/caja/HistorialMovimientos'
import RegistrarCompra from '../modules/compras/RegistrarCompra'
import CargarCostoCompra from '../modules/compras/CargarCostoCompra'
import HistorialCompras from '../modules/compras/HistorialCompras'
import ListasDePrecio from '../modules/precios/ListasDePrecio'
import AsignarReparto from '../modules/reparto/AsignarReparto'
import VistaChofer from '../modules/reparto/VistaChofer'
import ListaUsuarios from '../modules/usuarios/ListaUsuarios'
import ListaProveedores from '../modules/proveedores/ListaProveedores'
import CuentaCorrienteProveedores from '../modules/proveedores/CuentaCorrienteProveedores'
import ListaProductos from '../modules/productos/ListaProductos'
import DisponibilidadSucursal from '../modules/productos/DisponibilidadSucursal'
import ReporteDeuda from '../modules/cobranzas/ReporteDeuda'
import InformeCobranzas from '../modules/cobranzas/InformeCobranzas'
import ImprimirInformeCobranzas from '../modules/cobranzas/ImprimirInformeCobranzas'
import ComprobantePago from '../modules/cobranzas/ComprobantePago'
import CobrarCuentaCorriente from '../modules/cobranzas/CobrarCuentaCorriente'
import CobrarCuentaCorrienteSucursal from '../modules/sucursal/CobrarCuentaCorrienteSucursal'
import GestionCamionetas from '../modules/reparto/GestionCamionetas'
import RendicionChoferes from '../modules/reparto/RendicionChoferes'
import DiferenciasCobro from '../modules/reparto/DiferenciasCobro'
import ImprimirPerdida from '../modules/stock/ImprimirPerdida'
import ImprimirRemito from '../modules/ventas/ImprimirRemito'
import ImprimirHojaRuta from '../modules/reparto/ImprimirHojaRuta'
import ImprimirRecepcion from '../modules/compras/ImprimirRecepcion'
import ImprimirPagoProveedor from '../modules/proveedores/ImprimirPagoProveedor'
import ImprimirExcepcion from '../modules/cobranzas/ImprimirExcepcion'
import ImprimirDiferencia from '../modules/reparto/ImprimirDiferencia'
import TransferenciasSucursal from '../modules/reparto/TransferenciasSucursal'
import InicioSucursal from '../modules/sucursal/InicioSucursal'
import AceptarMercaderia from '../modules/sucursal/AceptarMercaderia'
import VentaSucursal from '../modules/sucursal/VentaSucursal'
import StockSucursal from '../modules/sucursal/StockSucursal'
import PerdidaSucursal from '../modules/sucursal/PerdidaSucursal'
import CajaSucursal from '../modules/sucursal/CajaSucursal'
import ConteoSucursal from '../modules/sucursal/ConteoSucursal'
import MisVentasSucursal from '../modules/sucursal/MisVentas'
import GestionSucursales from '../modules/administracion/GestionSucursales'
import RendicionesEfectivo from '../modules/caja/RendicionesEfectivo'
import ImprimirRendicion from '../modules/caja/ImprimirRendicion'
import ImprimirMovimientoCaja from '../modules/caja/ImprimirMovimientoCaja'
import InicioVendedor from '../modules/vendedor/InicioVendedor'
import InicioDeposito from '../modules/deposito/InicioDeposito'
import MovimientosCaja from '../modules/caja/MovimientosCaja'
import GestionCategorias from '../modules/catalogo/GestionCategorias'
import InicioCajero from '../modules/cajero/InicioCajero'
import CajaMostrador from '../modules/cajero/CajaMostrador'
import MisVentasCajero from '../modules/cajero/MisVentas'

function crearNavDueno(contadores, contadorComprasPendientesCosteo) {
  const contadorAprobaciones = contadores.pedidos_bloqueados_sucursal || 0
  return [
  { to: '/dueno', label: 'Dashboard', end: true },
  {
    grupo: 'Stock',
    icono: Package,
    items: [
      { to: '/dueno/stock', label: 'Stock actual' },
      { to: '/dueno/reporte-stock', label: 'Reporte de stock' },
      { to: '/dueno/conteo', label: 'Conteo de stock', contador: contadores.conteos_abiertos },
      { to: '/dueno/auditorias', label: 'Auditorías' },
      { to: '/dueno/perdidas', label: 'Pérdidas' },
    ],
  },
  {
    grupo: 'Ventas',
    icono: ShoppingCart,
    items: [
      { to: '/dueno/ventas', label: 'Tomar pedido' },
      { to: '/dueno/pedidos', label: 'Cobrar pedidos', contador: contadores.pedidos_pendientes },
      { to: '/dueno/aprobaciones', label: 'Aprobaciones', contador: contadorAprobaciones },
      { to: '/dueno/historial-precios-especiales', label: 'Historial de precios especiales' },
    ],
  },
  {
    grupo: 'Clientes',
    icono: Users,
    items: [
      { to: '/dueno/clientes-gestion', label: 'Gestión de clientes' },
      { to: '/dueno/cuenta-corriente', label: 'Cuenta corriente' },
    ],
  },
  {
    grupo: 'Cobranzas',
    icono: Receipt,
    items: [
      { to: '/dueno/cobranzas/cobrar', label: 'Cobrar cuenta corriente' },
      { to: '/dueno/cobranzas/deuda', label: 'Reporte de deuda' },
      { to: '/dueno/cobranzas/informe', label: 'Informe de cobranzas' },
    ],
  },
  {
    grupo: 'Compras',
    icono: PackageSearch,
    items: [
      { to: '/dueno/compras', label: 'Recepción de compra' },
      { to: '/dueno/cargar-costo', label: 'Cargar costo', contador: contadorComprasPendientesCosteo },
      { to: '/dueno/historial-compras', label: 'Historial de compras' },
      { to: '/dueno/proveedores', label: 'Proveedores' },
      { to: '/dueno/cuenta-corriente-proveedores', label: 'Cuenta corriente' },
    ],
  },
  { grupo: 'Precios', icono: Tag, items: [{ to: '/dueno/precios', label: 'Listas de precio' }] },
  {
    grupo: 'Caja',
    icono: Wallet,
    items: [
      { to: '/dueno/caja', label: 'Caja del día' },
      { to: '/dueno/arqueo', label: 'Arqueo' },
      { to: '/dueno/historial', label: 'Historial' },
      { to: '/dueno/movimientos-caja', label: 'Movimientos de caja' },
      { to: '/dueno/rendiciones', label: 'Rendiciones', contador: contadores.rendiciones_efectivo_pendientes },
    ],
  },
  {
    grupo: 'Reparto',
    icono: Truck,
    items: [
      { to: '/dueno/reparto', label: 'Asignar reparto', end: true, contador: contadores.reparto_sin_asignar },
      { to: '/dueno/camionetas', label: 'Camionetas' },
      { to: '/dueno/rendicion-choferes', label: 'Rendición de choferes' },
      { to: '/dueno/diferencias-cobro', label: 'Diferencias de cobro', contador: contadores.diferencias_cobro_pendientes },
      { to: '/dueno/transferencias', label: 'Transferencias a sucursal', contador: contadores.remitos_con_diferencia },
    ],
  },
  {
    grupo: 'Catálogo',
    icono: Egg,
    items: [
      { to: '/dueno/productos', label: 'Productos' },
      { to: '/dueno/categorias', label: 'Categorías' },
      { to: '/dueno/disponibilidad-sucursal', label: 'Disponibilidad por sucursal' },
    ],
  },
  {
    grupo: 'Administración',
    icono: Settings,
    items: [
      { to: '/dueno/usuarios', label: 'Usuarios' },
      { to: '/dueno/sucursales', label: 'Sucursales' },
    ],
  },
  ]
}

function crearNavAdmin(contadores) {
  const contadorAprobaciones = contadores.pedidos_bloqueados_sucursal || 0
  return [
  {
    grupo: 'Stock',
    icono: Package,
    items: [
      { to: '/admin/stock', label: 'Stock actual' },
      { to: '/admin/reporte-stock', label: 'Reporte de stock' },
      { to: '/admin/conteo', label: 'Conteo de stock', contador: contadores.conteos_abiertos },
      { to: '/admin/auditorias', label: 'Auditorías' },
    ],
  },
  {
    grupo: 'Ventas',
    icono: ShoppingCart,
    items: [
      { to: '/admin/ventas', label: 'Tomar pedido' },
      { to: '/admin/pedidos', label: 'Cobrar pedidos', end: true, contador: contadores.pedidos_pendientes },
      { to: '/admin/aprobaciones', label: 'Aprobaciones', contador: contadorAprobaciones },
      { to: '/admin/historial-precios-especiales', label: 'Historial de precios especiales' },
    ],
  },
  {
    grupo: 'Clientes',
    icono: Users,
    items: [
      { to: '/admin/clientes-gestion', label: 'Gestión de clientes' },
      { to: '/admin/cuenta-corriente', label: 'Cuenta corriente' },
    ],
  },
  {
    grupo: 'Cobranzas',
    icono: Receipt,
    items: [
      { to: '/admin/cobranzas/cobrar', label: 'Cobrar cuenta corriente' },
      { to: '/admin/cobranzas/deuda', label: 'Reporte de deuda' },
      { to: '/admin/cobranzas/informe', label: 'Informe de cobranzas' },
    ],
  },
  {
    grupo: 'Compras',
    icono: PackageSearch,
    items: [
      { to: '/admin/compras', label: 'Recepción de compra' },
      { to: '/admin/proveedores', label: 'Proveedores' },
    ],
  },
  { grupo: 'Precios', icono: Tag, items: [{ to: '/admin/precios', label: 'Listas de precio' }] },
  {
    grupo: 'Caja',
    icono: Wallet,
    items: [
      { to: '/admin/caja', label: 'Caja del día' },
      { to: '/admin/arqueo', label: 'Arqueo' },
      { to: '/admin/historial', label: 'Historial' },
      { to: '/admin/movimientos-caja', label: 'Movimientos de caja' },
      { to: '/admin/rendiciones', label: 'Rendiciones', contador: contadores.rendiciones_efectivo_pendientes },
    ],
  },
  {
    grupo: 'Reparto',
    icono: Truck,
    items: [
      { to: '/admin/camionetas', label: 'Camionetas' },
      { to: '/admin/rendicion-choferes', label: 'Rendición de choferes' },
      { to: '/admin/diferencias-cobro', label: 'Diferencias de cobro', contador: contadores.diferencias_cobro_pendientes },
      { to: '/admin/transferencias', label: 'Transferencias a sucursal', contador: contadores.remitos_con_diferencia },
    ],
  },
  {
    grupo: 'Catálogo',
    icono: Egg,
    items: [
      { to: '/admin/productos', label: 'Productos' },
      { to: '/admin/categorias', label: 'Categorías' },
      { to: '/admin/disponibilidad-sucursal', label: 'Disponibilidad por sucursal' },
    ],
  },
  { grupo: 'Administración', icono: Settings, items: [{ to: '/admin/sucursales', label: 'Sucursales' }] },
  ]
}

function InicioSesionResuelto() {
  const perfil = useAuthStore((s) => s.perfil)
  return <Navigate to={perfil ? RUTA_RAIZ_POR_ROL[perfil.rol] || '/login' : '/login'} replace />
}

// Único contador que quedó fuera de fn_contadores_notificaciones (no la
// modificamos porque no vino en el pedido) — se mantiene con su propio
// refresco silencioso de 20s, igual que antes.
function useContadorPeriodico(activo, obtenerContador) {
  const [contador, setContador] = useState(0)

  useEffect(() => {
    if (!activo) setContador(0)
  }, [activo])

  useRefrescoPeriodico(
    () => {
      obtenerContador()
        .then((n) => setContador(n))
        .catch(() => {})
    },
    { activo }
  )

  return contador
}

export default function AppRouter() {
  const perfil = useAuthStore((s) => s.perfil)
  const esDueno = perfil?.rol === ROLES.DUENO

  // Contadores de badges centralizados: una sola consulta (fn_contadores_notificaciones)
  // llamada una única vez acá arriba, repartida por props a todo lo demás en
  // vez de que cada pantalla dispare su propia query cada 20s.
  const contadores = useNotificaciones(!!perfil)
  // Fuera de fn_contadores_notificaciones (no la tocamos): cuántas compras
  // recibidas están sin costear, exclusivo de dueño (nadie más ve costos).
  const contadorComprasPendientesCosteo = useContadorPeriodico(esDueno, contarComprasPendientesCosteo)

  const navDueno = useMemo(
    () => crearNavDueno(contadores, contadorComprasPendientesCosteo),
    [contadores, contadorComprasPendientesCosteo]
  )
  const navAdmin = useMemo(() => crearNavAdmin(contadores), [contadores])
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<InicioSesionResuelto />} />

        <Route
          path="/dueno"
          element={
            <RutaProtegida rolesPermitidos={[ROLES.DUENO]}>
              <AppShell titulo="Dueño" navegacion={navDueno} />
            </RutaProtegida>
          }
        >
          <Route index element={<DashboardDueno contadores={contadores} />} />
          <Route path="stock" element={<StockGeneral />} />
          <Route path="reporte-stock" element={<ReporteStock />} />
          <Route path="conteo" element={<ConteoStock />} />
          <Route path="conteo/:id" element={<DetalleConteo />} />
          <Route path="auditorias" element={<AuditoriasConteo />} />
          <Route path="ventas" element={<TomarPedido />} />
          <Route path="pedidos" element={<ListaPedidos />} />
          <Route path="aprobaciones" element={<AprobarPrecioEspecial />} />
          <Route path="historial-precios-especiales" element={<HistorialPreciosEspeciales />} />
          <Route path="clientes-gestion" element={<GestionClientes />} />
          <Route path="cuenta-corriente" element={<CuentaCorriente />} />
          <Route path="cobranzas/cobrar" element={<CobrarCuentaCorriente />} />
          <Route path="cobranzas/deuda" element={<ReporteDeuda />} />
          <Route path="cobranzas/informe" element={<InformeCobranzas />} />
          <Route path="caja" element={<CajaDiaria />} />
          <Route path="arqueo" element={<Arqueo />} />
          <Route path="historial" element={<HistorialMovimientos />} />
          <Route path="movimientos-caja" element={<MovimientosCaja />} />
          <Route path="rendiciones" element={<RendicionesEfectivo />} />
          <Route path="compras" element={<RegistrarCompra />} />
          <Route path="cargar-costo" element={<CargarCostoCompra />} />
          <Route path="historial-compras" element={<HistorialCompras />} />
          <Route path="perdidas" element={<RegistrarPerdida />} />
          <Route path="precios" element={<ListasDePrecio />} />
          <Route path="reparto" element={<AsignarReparto />} />
          <Route path="camionetas" element={<GestionCamionetas />} />
          <Route path="rendicion-choferes" element={<RendicionChoferes />} />
          <Route path="diferencias-cobro" element={<DiferenciasCobro />} />
          <Route path="transferencias" element={<TransferenciasSucursal />} />
          <Route path="proveedores" element={<ListaProveedores />} />
          <Route path="cuenta-corriente-proveedores" element={<CuentaCorrienteProveedores />} />
          <Route path="productos" element={<ListaProductos />} />
          <Route path="categorias" element={<GestionCategorias />} />
          <Route path="disponibilidad-sucursal" element={<DisponibilidadSucursal />} />
          <Route path="usuarios" element={<ListaUsuarios />} />
          <Route path="sucursales" element={<GestionSucursales />} />
        </Route>

        <Route
          path="/admin"
          element={
            <RutaProtegida rolesPermitidos={[ROLES.ADMINISTRATIVO]}>
              <AppShell titulo="Administrativo" navegacion={navAdmin} />
            </RutaProtegida>
          }
        >
          <Route index element={<Navigate to="pedidos" replace />} />
          <Route path="stock" element={<StockGeneral />} />
          <Route path="reporte-stock" element={<ReporteStock />} />
          <Route path="conteo" element={<ConteoStock />} />
          <Route path="conteo/:id" element={<DetalleConteo />} />
          <Route path="auditorias" element={<AuditoriasConteo />} />
          <Route path="ventas" element={<TomarPedido />} />
          <Route path="pedidos" element={<ListaPedidos />} />
          <Route path="aprobaciones" element={<AprobarPrecioEspecial />} />
          <Route path="historial-precios-especiales" element={<HistorialPreciosEspeciales />} />
          <Route path="clientes-gestion" element={<GestionClientes />} />
          <Route path="cuenta-corriente" element={<CuentaCorriente />} />
          <Route path="cobranzas/cobrar" element={<CobrarCuentaCorriente />} />
          <Route path="cobranzas/deuda" element={<ReporteDeuda />} />
          <Route path="cobranzas/informe" element={<InformeCobranzas />} />
          <Route path="caja" element={<CajaDiaria />} />
          <Route path="arqueo" element={<Arqueo />} />
          <Route path="historial" element={<HistorialMovimientos />} />
          <Route path="movimientos-caja" element={<MovimientosCaja />} />
          <Route path="rendiciones" element={<RendicionesEfectivo />} />
          <Route path="compras" element={<RegistrarCompra />} />
          <Route path="precios" element={<ListasDePrecio />} />
          <Route path="camionetas" element={<GestionCamionetas />} />
          <Route path="rendicion-choferes" element={<RendicionChoferes />} />
          <Route path="diferencias-cobro" element={<DiferenciasCobro />} />
          <Route path="transferencias" element={<TransferenciasSucursal />} />
          <Route path="proveedores" element={<ListaProveedores />} />
          <Route path="productos" element={<ListaProductos />} />
          <Route path="categorias" element={<GestionCategorias />} />
          <Route path="disponibilidad-sucursal" element={<DisponibilidadSucursal />} />
          <Route path="sucursales" element={<GestionSucursales />} />
        </Route>

        {/* Depósito: sin sidebar, entra por InicioDeposito (3 botones grandes) — mismo
            criterio que /sucursal. Cada pantalla de destino se reutiliza tal cual (no
            se reconstruyen), envuelta en el padding que antes daba AppShell y con su
            propio botón "Volver" (BotonVolverInicio, adentro de cada componente). */}
        <Route
          path="/deposito"
          element={
            <RutaProtegida rolesPermitidos={[ROLES.DEPOSITO]}>
              <InicioDeposito />
            </RutaProtegida>
          }
        />
        <Route
          path="/deposito/stock"
          element={
            <RutaProtegida rolesPermitidos={[ROLES.DEPOSITO]}>
              <div className="p-4 sm:p-6">
                <StockGeneral />
              </div>
            </RutaProtegida>
          }
        />
        <Route
          path="/deposito/reporte-stock"
          element={
            <RutaProtegida rolesPermitidos={[ROLES.DEPOSITO]}>
              <div className="p-4 sm:p-6">
                <ReporteStock />
              </div>
            </RutaProtegida>
          }
        />
        <Route
          path="/deposito/conteo"
          element={
            <RutaProtegida rolesPermitidos={[ROLES.DEPOSITO]}>
              <div className="p-4 sm:p-6">
                <ConteoStock />
              </div>
            </RutaProtegida>
          }
        />
        <Route
          path="/deposito/conteo/:id"
          element={
            <RutaProtegida rolesPermitidos={[ROLES.DEPOSITO]}>
              <div className="p-4 sm:p-6">
                <DetalleConteo />
              </div>
            </RutaProtegida>
          }
        />
        <Route
          path="/deposito/perdidas"
          element={
            <RutaProtegida rolesPermitidos={[ROLES.DEPOSITO]}>
              <div className="p-4 sm:p-6">
                <RegistrarPerdida />
              </div>
            </RutaProtegida>
          }
        />
        <Route
          path="/deposito/recepcion-compra"
          element={
            <RutaProtegida rolesPermitidos={[ROLES.DEPOSITO]}>
              <div className="p-4 sm:p-6">
                <RecepcionCompra />
              </div>
            </RutaProtegida>
          }
        />
        <Route
          path="/deposito/reparto"
          element={
            <RutaProtegida rolesPermitidos={[ROLES.DEPOSITO]}>
              <div className="p-4 sm:p-6">
                <AsignarReparto />
              </div>
            </RutaProtegida>
          }
        />

        {/* Vendedor: mismo criterio, entra por InicioVendedor. */}
        <Route
          path="/vendedor"
          element={
            <RutaProtegida rolesPermitidos={[ROLES.VENDEDOR]}>
              <InicioVendedor />
            </RutaProtegida>
          }
        />
        <Route
          path="/vendedor/vender"
          element={
            <RutaProtegida rolesPermitidos={[ROLES.VENDEDOR]}>
              <div className="p-4 sm:p-6">
                <TomarPedido />
              </div>
            </RutaProtegida>
          }
        />
        <Route
          path="/vendedor/pedidos"
          element={
            <RutaProtegida rolesPermitidos={[ROLES.VENDEDOR]}>
              <div className="p-4 sm:p-6">
                <ListaPedidos soloPropios />
              </div>
            </RutaProtegida>
          }
        />
        <Route
          path="/vendedor/clientes"
          element={
            <RutaProtegida rolesPermitidos={[ROLES.VENDEDOR]}>
              <div className="p-4 sm:p-6">
                <GestionClientes />
              </div>
            </RutaProtegida>
          }
        />

        <Route
          path="/conteo/:id/imprimir"
          element={
            <RutaProtegida rolesPermitidos={[ROLES.DUENO, ROLES.ADMINISTRATIVO, ROLES.DEPOSITO]}>
              <ImprimirConteo />
            </RutaProtegida>
          }
        />

        <Route
          path="/arqueo/:id/imprimir"
          element={
            <RutaProtegida
              rolesPermitidos={[ROLES.DUENO, ROLES.ADMINISTRATIVO, ROLES.ENCARGADO_SUCURSAL, ROLES.CAJERO_MOSTRADOR]}
            >
              <ImprimirArqueo />
            </RutaProtegida>
          }
        />

        <Route
          path="/cobranzas/informe/imprimir"
          element={
            <RutaProtegida rolesPermitidos={[ROLES.DUENO, ROLES.ADMINISTRATIVO]}>
              <ImprimirInformeCobranzas />
            </RutaProtegida>
          }
        />

        <Route
          path="/pago/:id/imprimir"
          element={
            <RutaProtegida rolesPermitidos={[ROLES.DUENO, ROLES.ADMINISTRATIVO, ROLES.VENDEDOR, ROLES.ENCARGADO_SUCURSAL]}>
              <ComprobantePago />
            </RutaProtegida>
          }
        />

        <Route
          path="/perdida/:id/imprimir"
          element={
            <RutaProtegida rolesPermitidos={[ROLES.DUENO, ROLES.DEPOSITO, ROLES.ENCARGADO_SUCURSAL]}>
              <ImprimirPerdida />
            </RutaProtegida>
          }
        />

        <Route
          path="/pedido/:id/imprimir"
          element={
            <RutaProtegida rolesPermitidos={[ROLES.DUENO, ROLES.ADMINISTRATIVO, ROLES.VENDEDOR, ROLES.DEPOSITO]}>
              <ImprimirRemito />
            </RutaProtegida>
          }
        />

        <Route
          path="/hoja-ruta/:choferId/:camionetaId/:fecha/imprimir"
          element={
            <RutaProtegida rolesPermitidos={[ROLES.DUENO, ROLES.DEPOSITO]}>
              <ImprimirHojaRuta />
            </RutaProtegida>
          }
        />

        <Route
          path="/compra/:id/imprimir"
          element={
            <RutaProtegida rolesPermitidos={[ROLES.DUENO, ROLES.ADMINISTRATIVO, ROLES.DEPOSITO]}>
              <ImprimirRecepcion />
            </RutaProtegida>
          }
        />

        <Route
          path="/pago-proveedor/:id/imprimir"
          element={
            <RutaProtegida rolesPermitidos={[ROLES.DUENO]}>
              <ImprimirPagoProveedor />
            </RutaProtegida>
          }
        />

        <Route
          path="/excepcion/:id/imprimir"
          element={
            <RutaProtegida rolesPermitidos={[ROLES.DUENO, ROLES.ADMINISTRATIVO]}>
              <ImprimirExcepcion />
            </RutaProtegida>
          }
        />

        <Route
          path="/diferencia/:id/imprimir"
          element={
            <RutaProtegida rolesPermitidos={[ROLES.DUENO, ROLES.ADMINISTRATIVO]}>
              <ImprimirDiferencia />
            </RutaProtegida>
          }
        />

        <Route
          path="/rendicion/:id/imprimir"
          element={
            <RutaProtegida rolesPermitidos={[ROLES.DUENO, ROLES.ADMINISTRATIVO, ROLES.VENDEDOR, ROLES.ENCARGADO_SUCURSAL]}>
              <ImprimirRendicion />
            </RutaProtegida>
          }
        />

        <Route
          path="/movimiento-caja/:id/imprimir"
          element={
            <RutaProtegida
              rolesPermitidos={[ROLES.DUENO, ROLES.ADMINISTRATIVO, ROLES.ENCARGADO_SUCURSAL, ROLES.CAJERO_MOSTRADOR]}
            >
              <ImprimirMovimientoCaja />
            </RutaProtegida>
          }
        />

        <Route
          path="/chofer"
          element={
            <RutaProtegida rolesPermitidos={[ROLES.CHOFER]}>
              <VistaChofer contadorEntregasPendientes={contadores.entregas_pendientes_chofer} />
            </RutaProtegida>
          }
        />

        <Route
          path="/sucursal"
          element={
            <RutaProtegida rolesPermitidos={[ROLES.ENCARGADO_SUCURSAL]}>
              <InicioSucursal contadorAceptarMercaderia={contadores.remitos_por_aceptar} />
            </RutaProtegida>
          }
        />

        <Route
          path="/sucursal/aceptar-mercaderia"
          element={
            <RutaProtegida rolesPermitidos={[ROLES.ENCARGADO_SUCURSAL]}>
              <AceptarMercaderia />
            </RutaProtegida>
          }
        />

        <Route
          path="/sucursal/vender"
          element={
            <RutaProtegida rolesPermitidos={[ROLES.ENCARGADO_SUCURSAL]}>
              <VentaSucursal />
            </RutaProtegida>
          }
        />

        <Route
          path="/sucursal/mis-ventas"
          element={
            <RutaProtegida rolesPermitidos={[ROLES.ENCARGADO_SUCURSAL]}>
              <MisVentasSucursal />
            </RutaProtegida>
          }
        />

        <Route
          path="/sucursal/stock"
          element={
            <RutaProtegida rolesPermitidos={[ROLES.ENCARGADO_SUCURSAL]}>
              <StockSucursal contadorConteo={contadores.conteos_abiertos} />
            </RutaProtegida>
          }
        />

        <Route
          path="/sucursal/perdidas"
          element={
            <RutaProtegida rolesPermitidos={[ROLES.ENCARGADO_SUCURSAL]}>
              <PerdidaSucursal />
            </RutaProtegida>
          }
        />

        <Route
          path="/sucursal/conteo"
          element={
            <RutaProtegida rolesPermitidos={[ROLES.ENCARGADO_SUCURSAL]}>
              <ConteoSucursal />
            </RutaProtegida>
          }
        />

        <Route
          path="/sucursal/caja"
          element={
            <RutaProtegida rolesPermitidos={[ROLES.ENCARGADO_SUCURSAL]}>
              <CajaSucursal />
            </RutaProtegida>
          }
        />

        <Route
          path="/sucursal/cobrar-cc"
          element={
            <RutaProtegida rolesPermitidos={[ROLES.ENCARGADO_SUCURSAL]}>
              <CobrarCuentaCorrienteSucursal />
            </RutaProtegida>
          }
        />

        {/* Cajero mostrador: sin sidebar, misma sucursal siempre (Casa Central).
            "Vender" es un modal dentro de InicioCajero, no una ruta aparte. */}
        <Route
          path="/cajero"
          element={
            <RutaProtegida rolesPermitidos={[ROLES.CAJERO_MOSTRADOR]}>
              <InicioCajero />
            </RutaProtegida>
          }
        />

        <Route
          path="/cajero/caja"
          element={
            <RutaProtegida rolesPermitidos={[ROLES.CAJERO_MOSTRADOR]}>
              <CajaMostrador />
            </RutaProtegida>
          }
        />

        <Route
          path="/cajero/mis-ventas"
          element={
            <RutaProtegida rolesPermitidos={[ROLES.CAJERO_MOSTRADOR]}>
              <MisVentasCajero />
            </RutaProtegida>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
