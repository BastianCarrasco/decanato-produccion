import React from "react";
import { Home, Eye, Edit, BarChart3, DollarSign, FileText } from "lucide-react";
import logo from "@/assets/k2i-control-logo.png";

const Sidebar = ({ activeItem, onNavItemClick }) => {
  const menuItems = [
    { id: "home", label: "Inicio", icon: Home, path: "/" },
    {
      id: "visualizacion",
      label: "Ver Cartera",
      icon: Eye,
      path: "/visualizacion",
    },
    {
      id: "modificar",
      label: "Modificar Cartera",
      icon: Edit,
      path: "/anadir-proyectos",
    },
    {
      id: "estadisticas",
      label: "Estadísticas",
      icon: BarChart3,
      path: "/estadisticas",
    },
    { id: "fondos", label: "Fondos", icon: DollarSign, path: "/fondos" },
    {
      id: "formularios",
      label: "Formularios",
      icon: FileText,
      path: "/formularios",
    },
  ];

  return (
    <div className="w-64 bg-slate-200 text-gray-800 h-screen fixed left-0 top-0 overflow-y-auto shadow-lg border-r border-gray-200">
      {/* Título/Logo */}
      <div className="p-6 border-b border-gray-200 bg-[#2E5C8A]">
        <img src={logo} alt="k2i control logo" className="h-8 w-auto" />
      </div>

      {/* Opciones del menú */}
      <nav className="mt-6 px-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavItemClick(item.id)}
                  className={`w-full flex items-center px-4 py-3 rounded-lg transition-all duration-200 hover:bg-blue-50 hover:text-blue-600 group ${
                    activeItem === item.id
                      ? "bg-blue-100 text-blue-700 border-r-4 border-blue-600"
                      : "text-gray-700"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 mr-3 transition-colors ${
                      activeItem === item.id
                        ? "text-blue-600"
                        : "text-gray-500 group-hover:text-blue-600"
                    }`}
                  />
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;
