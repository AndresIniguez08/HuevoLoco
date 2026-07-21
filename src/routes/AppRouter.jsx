import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Package, ShoppingCart, Users, Truck, PackageSearch, Tag, Wallet, Egg, Settings, Receipt } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { ROLES, RUTA_RAIZ_POR_ROL } from '../lib/constantes'
import { contarDiferenciasSinRevisar } from '../lib/diferenciasCobro'
import RutaProtegida from '../components/RutaProtegida'
import AppShell from '../components/AppShell'
import Login from '../modules/auth/Login'
import DashboardDueno from '../modules/dashboard/DashboardDueno'
import StockActual from '../modules/stock/StockActual'
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
import GestionClientes from '../modules/clientes/GestionClientes'
import CuentaCorriente from '../modules/clientes/CuentaCorriente'
import CajaDiaria from '../modules/caja/CajaDiaria'
import Arqueo from '../modules/caja/Arqueo'
import ImprimirArqueo from '../modules/caja/ImprimirArqueo'
import HistorialMovimientos from '../modules/caja/HistorialMovimientos'
import RegistrarCompra from '../modules/compras/RegistrarCompra'
import ListasDePrecio from '../modules/precios/ListasDePrecio'
import AsignarReparto from '../modules/reparto/AsignarReparto'
import VistaChofer from '../modules/reparto/VistaChofer'
import ListaUsuarios from '../modules/usuarios/ListaUsuarios'
import ListaProveedores from '../modules/proveedores/ListaProveedores'
import ListaProductos from '../modules/productos/ListaProductos'
import ReporteDeuda from '../modules/cobranzas/ReporteDeuda'
import InformeCobranzas from '../modules/cobranzas/InformeCobranzas'
import ImprimirInformeCobranzas from '../modules/cobranzas/ImprimirInformeCobranzas'
import ComprobantePago from '../modules/cobranzas/ComprobantePago'
import GestionCamionetas from '../modules/reparto/GestionCamionetas'
import RendicionChoferes from '../modules/reparto/RendicionChoferes'
import DiferenciasCobro from '../modules/reparto/DiferenciasCobro'

function crearNavDueno(contadorDiferencias) {
  return [
  { to: '/dueno', label: 'Dashboard', end: true },
  {
    grupo: 'Stock',
    icono: Package,
    items: [
      { to: '/dueno/stock', label: 'Stock actual' },
      { to: '/dueno/reporte-stock', label: 'Reporte de stock' },
      { to: '/dueno/conteo', label: 'Conteo de stock' },
      { to: '/dueno/auditorias', label: 'Auditorías' },
      { to: '/dueno/perdidas', label: 'Pérdidas' },
    ],
  },
  {
    grupo: 'Ventas',
    icono: ShoppingCart,
    items: [
      { to: '/dueno/ventas', label: 'Tomar pedido' },
      { to: '/dueno/pedidos', label: 'Pedidos' },
      { to: '/dueno/aprobaciones', label: 'Aprobaciones' },
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
      { to: '/dueno/cobranzas/deuda', label: 'Reporte de deuda' },
      { to: '/dueno/cobranzas/informe', label: 'Informe de cobranzas' },
    ],
  },
  {
    grupo: 'Compras',
    icono: PackageSearch,
    items: [
      { to: '/dueno/compras', label: 'Registrar compra' },
      { to: '/dueno/proveedores', label: 'Proveedores' },
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
    ],
  },
  {
    grupo: 'Reparto',
    icono: Truck,
    items: [
      { to: '/dueno/reparto', label: 'Asignar reparto', end: true },
      { to: '/dueno/camionetas', label: 'Camionetas' },
      { to: '/dueno/rendicion-choferes', label: 'Rendición de choferes' },
      { to: '/dueno/diferencias-cobro', label: 'Diferencias de cobro', contador: contadorDiferencias },
    ],
  },
  { grupo: 'Catálogo', icono: Egg, items: [{ to: '/dueno/productos', label: 'Productos' }] },
  { grupo: 'Administración', icono: Settings, items: [{ to: '/dueno/usuarios', label: 'Usuarios' }] },
  ]
}

function crearNavAdmin(contadorDiferencias) {
  return [
  {
    grupo: 'Stock',
    icono: Package,
    items: [
      { to: '/admin/reporte-stock', label: 'Reporte de stock' },
      { to: '/admin/conteo', label: 'Conteo de stock' },
      { to: '/admin/auditorias', label: 'Auditorías' },
    ],
  },
  {
    grupo: 'Ventas',
    icono: ShoppingCart,
    items: [
      { to: '/admin/ventas', label: 'Tomar pedido' },
      { to: '/admin/pedidos', label: 'Pedidos', end: true },
      { to: '/admin/aprobaciones', label: 'Aprobaciones' },
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
      { to: '/admin/cobranzas/deuda', label: 'Reporte de deuda' },
      { to: '/admin/cobranzas/informe', label: 'Informe de cobranzas' },
    ],
  },
  {
    grupo: 'Compras',
    icono: PackageSearch,
    items: [
      { to: '/admin/compras', label: 'Registrar compra' },
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
    ],
  },
  {
    grupo: 'Reparto',
    icono: Truck,
    items: [
      { to: '/admin/camionetas', label: 'Camionetas' },
      { to: '/admin/rendicion-choferes', label: 'Rendición de choferes' },
      { to: '/admin/diferencias-cobro', label: 'Diferencias de cobro', contador: contadorDiferencias },
    ],
  },
  { grupo: 'Catálogo', icono: Egg, items: [{ to: '/admin/productos', label: 'Productos' }] },
  ]
}

const NAV_DEPOSITO = [
  {
    grupo: 'Stock',
    icono: Package,
    items: [
      { to: '/deposito/stock', label: 'Stock actual', end: true },
      { to: '/deposito/reporte-stock', label: 'Reporte de stock' },
      { to: '/deposito/conteo', label: 'Conteo de stock' },
      { to: '/deposito/auditorias', label: 'Auditorías' },
      { to: '/deposito/perdidas', label: 'Pérdidas' },
    ],
  },
  { grupo: 'Compras', icono: Truck, items: [{ to: '/deposito/recepcion-compra', label: 'Recepción de compra' }] },
  {
    grupo: 'Reparto',
    icono: Truck,
    items: [
      { to: '/deposito/reparto', label: 'Asignar reparto', end: true },
      { to: '/deposito/camionetas', label: 'Camionetas' },
    ],
  },
]

const NAV_VENDEDOR = [
  {
    grupo: 'Ventas',
    icono: ShoppingCart,
    items: [
      { to: '/vendedor/pedido', label: 'Tomar pedido', end: true },
      { to: '/vendedor/pedidos', label: 'Mis pedidos' },
    ],
  },
  { grupo: 'Clientes', icono: Users, items: [{ to: '/vendedor/clientes-gestion', label: 'Gestión de clientes' }] },
]

function InicioSesionResuelto() {
  const perfil = useAuthStore((s) => s.perfil)
  return <Navigate to={perfil ? RUTA_RAIZ_POR_ROL[perfil.rol] || '/login' : '/login'} replace />
}

// Refresca cada 30s mientras el dueño/administrativo tiene la sesión abierta,
// para que el badge de la sidebar no quede desactualizado por mucho tiempo.
function useContadorDiferenciasCobro(activo) {
  const [contador, setContador] = useState(0)

  useEffect(() => {
    if (!activo) {
      setContador(0)
      return
    }
    let vivo = true
    function refrescar() {
      contarDiferenciasSinRevisar()
        .then((n) => {
          if (vivo) setContador(n)
        })
        .catch(() => {})
    }
    refrescar()
    const intervalo = setInterval(refrescar, 30000)
    return () => {
      vivo = false
      clearInterval(intervalo)
    }
  }, [activo])

  return contador
}

export default function AppRouter() {
  const perfil = useAuthStore((s) => s.perfil)
  const puedeVerDiferencias = perfil?.rol === ROLES.DUENO || perfil?.rol === ROLES.ADMINISTRATIVO
  const contadorDiferencias = useContadorDiferenciasCobro(puedeVerDiferencias)
  const navDueno = useMemo(() => crearNavDueno(contadorDiferencias), [contadorDiferencias])
  const navAdmin = useMemo(() => crearNavAdmin(contadorDiferencias), [contadorDiferencias])

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
          <Route index element={<DashboardDueno />} />
          <Route path="stock" element={<StockActual />} />
          <Route path="reporte-stock" element={<ReporteStock />} />
          <Route path="conteo" element={<ConteoStock />} />
          <Route path="conteo/:id" element={<DetalleConteo />} />
          <Route path="auditorias" element={<AuditoriasConteo />} />
          <Route path="ventas" element={<TomarPedido />} />
          <Route path="pedidos" element={<ListaPedidos />} />
          <Route path="aprobaciones" element={<AprobarPrecioEspecial />} />
          <Route path="clientes-gestion" element={<GestionClientes />} />
          <Route path="cuenta-corriente" element={<CuentaCorriente />} />
          <Route path="cobranzas/deuda" element={<ReporteDeuda />} />
          <Route path="cobranzas/informe" element={<InformeCobranzas />} />
          <Route path="caja" element={<CajaDiaria />} />
          <Route path="arqueo" element={<Arqueo />} />
          <Route path="historial" element={<HistorialMovimientos />} />
          <Route path="compras" element={<RegistrarCompra />} />
          <Route path="perdidas" element={<RegistrarPerdida />} />
          <Route path="precios" element={<ListasDePrecio />} />
          <Route path="reparto" element={<AsignarReparto />} />
          <Route path="camionetas" element={<GestionCamionetas />} />
          <Route path="rendicion-choferes" element={<RendicionChoferes />} />
          <Route path="diferencias-cobro" element={<DiferenciasCobro />} />
          <Route path="proveedores" element={<ListaProveedores />} />
          <Route path="productos" element={<ListaProductos />} />
          <Route path="usuarios" element={<ListaUsuarios />} />
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
          <Route path="reporte-stock" element={<ReporteStock />} />
          <Route path="conteo" element={<ConteoStock />} />
          <Route path="conteo/:id" element={<DetalleConteo />} />
          <Route path="auditorias" element={<AuditoriasConteo />} />
          <Route path="ventas" element={<TomarPedido />} />
          <Route path="pedidos" element={<ListaPedidos />} />
          <Route path="aprobaciones" element={<AprobarPrecioEspecial />} />
          <Route path="clientes-gestion" element={<GestionClientes />} />
          <Route path="cuenta-corriente" element={<CuentaCorriente />} />
          <Route path="cobranzas/deuda" element={<ReporteDeuda />} />
          <Route path="cobranzas/informe" element={<InformeCobranzas />} />
          <Route path="caja" element={<CajaDiaria />} />
          <Route path="arqueo" element={<Arqueo />} />
          <Route path="historial" element={<HistorialMovimientos />} />
          <Route path="compras" element={<RegistrarCompra />} />
          <Route path="precios" element={<ListasDePrecio />} />
          <Route path="camionetas" element={<GestionCamionetas />} />
          <Route path="rendicion-choferes" element={<RendicionChoferes />} />
          <Route path="diferencias-cobro" element={<DiferenciasCobro />} />
          <Route path="proveedores" element={<ListaProveedores />} />
          <Route path="productos" element={<ListaProductos />} />
        </Route>

        <Route
          path="/deposito"
          element={
            <RutaProtegida rolesPermitidos={[ROLES.DEPOSITO]}>
              <AppShell titulo="Depósito" navegacion={NAV_DEPOSITO} />
            </RutaProtegida>
          }
        >
          <Route index element={<Navigate to="stock" replace />} />
          <Route path="stock" element={<StockActual />} />
          <Route path="reporte-stock" element={<ReporteStock />} />
          <Route path="conteo" element={<ConteoStock />} />
          <Route path="conteo/:id" element={<DetalleConteo />} />
          <Route path="auditorias" element={<AuditoriasConteo />} />
          <Route path="perdidas" element={<RegistrarPerdida />} />
          <Route path="recepcion-compra" element={<RecepcionCompra />} />
          <Route path="reparto" element={<AsignarReparto />} />
          <Route path="camionetas" element={<GestionCamionetas />} />
        </Route>

        <Route
          path="/vendedor"
          element={
            <RutaProtegida rolesPermitidos={[ROLES.VENDEDOR]}>
              <AppShell titulo="Vendedor" navegacion={NAV_VENDEDOR} />
            </RutaProtegida>
          }
        >
          <Route index element={<Navigate to="pedido" replace />} />
          <Route path="pedido" element={<TomarPedido />} />
          <Route path="pedidos" element={<ListaPedidos soloPropios />} />
          <Route path="clientes-gestion" element={<GestionClientes />} />
        </Route>

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
            <RutaProtegida rolesPermitidos={[ROLES.DUENO, ROLES.ADMINISTRATIVO]}>
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
            <RutaProtegida rolesPermitidos={[ROLES.DUENO, ROLES.ADMINISTRATIVO, ROLES.VENDEDOR]}>
              <ComprobantePago />
            </RutaProtegida>
          }
        />

        <Route
          path="/chofer"
          element={
            <RutaProtegida rolesPermitidos={[ROLES.CHOFER]}>
              <VistaChofer />
            </RutaProtegida>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
