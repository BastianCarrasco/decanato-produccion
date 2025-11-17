import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from "react-router-dom";

import Navbar from "./pages/layout/Navbar";
import Sidebar from "./pages/components/Sidebar";
import Footer from "./pages/layout/Footer";

// Importa tus componentes de página nuevos y existentes
import HomePage from "./pages/HomePage";
import VisualizacionPage from "./pages/VisualizacionPage";
import EstadisticasPage from "./pages/EstadisticasPage";
import FondosPage from "./pages/FondosPage";
import FormulariosPage from "./pages/FormulariosPage";
import AnadirProyectosPage from "./pages/AnadirProyectosPage";
import EditarProyectosPage from "./pages/EditarProyectosPage";
import ModificarCarteraPage from "./pages/ModificarCarteraPage";

import { LoadingProvider } from "./contexts/LoadingContext";
import { ErrorProvider } from "./contexts/ErrorContext";
import { ProyectosProvider } from "./contexts/ProyectosContext";

// --- Componente principal de la aplicación
function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  // Función para determinar qué elemento del Sidebar está activo
  const getActiveSidebarItem = () => {
    const currentPath = location.pathname;

    if (currentPath === "/") return "home";
    if (currentPath.startsWith("/visualizacion")) return "visualizacion";

    // Modificar Cartera activa con sus sub-rutas
    if (
      currentPath.startsWith("/modificar") 
    ) {
      return "modificar";
    }

    if (currentPath.startsWith("/estadisticas")) return "estadisticas";
    if (currentPath.startsWith("/fondos")) return "fondos";
    if (currentPath.startsWith("/formularios")) return "formularios";

    return "home"; // Valor por defecto
  };

  const activeSidebarItem = getActiveSidebarItem();

  // Función para manejar la navegación desde el Sidebar
  const handleSidebarNavigation = (item) => {
    switch (item) {
      case "home":
        navigate("/");
        break;
      case "visualizacion":
        navigate("/visualizacion");
        break;
      case "modificar":
        navigate("/modificar");
        break;
      case "estadisticas":
        navigate("/estadisticas");
        break;
      case "fondos":
        navigate("/fondos");
        break;
      case "formularios":
        navigate("/formularios");
        break;
      default:
        navigate("/"); // Fallback a Home
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar Fijo */}
      <Sidebar
        activeItem={activeSidebarItem}
        onNavItemClick={handleSidebarNavigation}
      />

      {/* Contenido Dinámico de la Página (ocupará el espacio restante) */}
      <main className="flex-grow ml-64">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/visualizacion" element={<VisualizacionPage />} />
          <Route path="/modificar" element={<ModificarCarteraPage />} />

          {/* Nuevas rutas directas para las páginas de Cartera */}
          {/* <Route path="/anadir-proyectos" element={<AnadirProyectosPage />} /> */}
          {/* <Route path="/editar-proyectos" element={<EditarProyectosPage />} /> */}

          <Route path="/estadisticas" element={<EstadisticasPage />} />
          <Route path="/fondos" element={<FondosPage />} />
          <Route path="/formularios" element={<FormulariosPage />} />

          {/* Ruta 404 para cualquier otra URL */}
          <Route path="*" element={<div>Página no encontrada (404)</div>} />
        </Routes>
        {/* Footer Fijo  */}
        {/* <Footer /> */}
      </main>
    </div>
  );
}

// Envuelve todo el contenido de la aplicación con los Context Providers
export default function App() {
  return (
    <Router>
      <ErrorProvider>
        <LoadingProvider>
          <ProyectosProvider>
            <AppContent />
          </ProyectosProvider>
        </LoadingProvider>
      </ErrorProvider>
    </Router>
  );
}
