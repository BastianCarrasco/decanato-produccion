// src/pages/HomePage.jsx
import { Button } from "@/components/ui/button";
import funcionesService from "../api/funciones.js";
import estudiantesService from "../api/estudiantes.js";
import FondosActivosSection from "../pages/components/FondosActivosSection";
import estadisticasService from "../api/estadisticas.js";
import { useState, useEffect } from "react";
import { useProyectos } from "@/contexts/ProyectosContext";
import { Spinner } from "@/components/ui/spinner";

import {
  BarChart3,
  FolderPlus,
  PenTool,
  Plus,
  ArrowRight,
  ContactRound,
  FolderOpen,
  FolderCheck,
  FileDown,
  Copy,
  TrendingUp,
  Activity,
  FileText,
  Sheet,
  Zap,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { useError } from "@/contexts/ErrorContext";
import { useExportData } from "@/hooks/useExportDataCartera";

const FORMULARIO_PERFIL_URL =
  "https://formularioproyectos-production.up.railway.app/";

export default function HomePage() {
  const { proyectosContexto, setProyectosContexto } = useProyectos();
  const navigate = useNavigate();
  const [proyectosCrudosData, setProyectosCrudosData] = useState([]);
  const [proyectosProfesorData, setProyectosProfesorData] = useState([]);
  const [loadingQuickStats, setLoadingQuickStats] = useState(true);
  const { setError } = useError();
  const [copiedMessage, setCopiedMessage] = useState(false);

  const { loadingExportPDF, loadingExportExcel, generarPDF, generarExcel } =
    useExportData();

  const proyectosEnCartera = Array.isArray(proyectosCrudosData)
    ? proyectosCrudosData.length
    : 0;
  const postuladosCount = Array.isArray(proyectosCrudosData)
    ? proyectosCrudosData.filter((p) => p.estatus === "Postulado").length
    : 0;
  const perfiladosCount = Array.isArray(proyectosCrudosData)
    ? proyectosCrudosData.filter((p) => p.estatus === "Perfil").length
    : 0;

  const fetchData = async () => {
    setLoadingQuickStats(true);
    setError(null);
    try {
      const [projectsResponse, academicosResponse, profProjectsResponse] =
        await Promise.all([
          funcionesService.getDataInterseccionProyectos(),
          funcionesService.getAcademicosPorProyecto(),
          estadisticasService.getAcademicosPorUnidad(),
        ]);

      const projects = Array.isArray(projectsResponse) ? projectsResponse : [];
      const academicosPorProyecto = Array.isArray(academicosResponse)
        ? academicosResponse
        : [];

      const newAcademicosMap = academicosPorProyecto.reduce((map, item) => {
        map[item.id_proyecto] = item;
        return map;
      }, {});

      const estudiantesPromises = projects.map(async (project) => {
        try {
          const estudiantes =
            await estudiantesService.getEstudiantesPorProyecto(
              project.id_proyecto
            );
          return { id_proyecto: project.id_proyecto, estudiantes };
        } catch (e) {
          console.error(
            `Error al obtener estudiantes para proyecto ${project.id_proyecto}:`,
            e
          );
          return { id_proyecto: project.id_proyecto, estudiantes: [] };
        }
      });

      const estudiantesResponses = await Promise.all(estudiantesPromises);

      const newEstudiantesMap = estudiantesResponses.reduce((map, item) => {
        map[item.id_proyecto] = item.estudiantes;
        return map;
      }, {});

      const projectsWithAcademicosAndEstudiantes = projects.map((project) => ({
        ...project,
        academicos: newAcademicosMap[project.id_proyecto]?.profesores || [],
        estudiantes: newEstudiantesMap[project.id_proyecto] || [],
      }));

      setProyectosContexto(projectsWithAcademicosAndEstudiantes);
      setProyectosCrudosData(projects);
      setProyectosProfesorData(
        Array.isArray(profProjectsResponse) ? profProjectsResponse : []
      );
    } catch (e) {
      console.error("Error fetching data for dashboard summary:", e);
      setError(e.message || "Error desconocido al cargar los datos.");
    } finally {
      setLoadingQuickStats(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCopyLinkFormulario = async () => {
    try {
      await navigator.clipboard.writeText(FORMULARIO_PERFIL_URL);
      setCopiedMessage(true);
      setError({
        type: "success",
        title: "Enlace copiado!",
        description: "El enlace al formulario ha sido copiado al portapapeles.",
      });
      setTimeout(() => {
        setCopiedMessage(false);
        setError(null);
      }, 3000);
    } catch (err) {
      console.error("Error al copiar el enlace:", err);
      setError({
        type: "error",
        title: "Error al Copiar",
        description: "No se pudo copiar el enlace al portapapeles.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-200 via-sky-300 to-blue-200">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Hero Section - Con efecto glass */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2E5C8A] via-[#3B76B3] to-[#4A90D9] p-8 shadow-2xl">
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage: `
        linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)
      `,
              backgroundSize: "30px 30px",
            }}
          ></div>

          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-3">
                <h1 className="text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
                  Gestión de Proyectos
                </h1>
                <p className="text-blue-100 text-lg max-w-2xl">
                  Monitorea y administra tu cartera completa desde un solo lugar
                </p>
              </div>

              {/* Botones de exportar con glassmorphism */}
              <div className="flex flex-wrap gap-3">
                <Button
                  className="bg-white/10 backdrop-blur-md text-white hover:bg-white/20 hover:scale-105 transition-all duration-200 shadow-lg border border-white/30"
                  onClick={generarPDF}
                  disabled={loadingExportPDF}
                >
                  {loadingExportPDF ? (
                    <Spinner size={16} className="text-white mr-2" />
                  ) : (
                    <div className="bg-white/20 backdrop-blur-sm rounded-full p-1.5 mr-2">
                      <FileText />
                    </div>
                  )}
                  Exportar PDF
                </Button>

                <Button
                  className="bg-white/10 backdrop-blur-md text-white hover:bg-white/20 hover:scale-105 transition-all duration-200 shadow-lg border border-white/30"
                  onClick={generarExcel}
                  disabled={loadingExportExcel}
                >
                  {loadingExportExcel ? (
                    <Spinner size={16} className="text-white mr-2" />
                  ) : (
                    <div className="bg-white/20 backdrop-blur-sm rounded-full p-1.5 mr-2">
                      <Sheet />
                    </div>
                  )}
                  Exportar Excel
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Bento Grid Layout - Con glassmorphism */}
        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-6 auto-rows-fr">
          {/* Stat Card Grande - Total Proyectos con efecto glass */}
          <div className="md:col-span-3 lg:col-span-5 bg-white/40 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/50 hover:bg-white/50 hover:shadow-2xl transition-all duration-300 group">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-[#2E5C8A]/80 mb-1">
                  Total Proyectos
                </p>
                {loadingQuickStats ? (
                  <div className="flex items-center h-12">
                    <Spinner size={32} className="text-[#2E5C8A]" />
                  </div>
                ) : (
                  <>
                    <p className="text-5xl font-bold text-[#2E5C8A] mb-2">
                      {proyectosEnCartera}
                    </p>
                    <div className="flex items-center gap-1 text-blue-700 text-sm font-medium">
                      <TrendingUp className="w-4 h-4" />
                      <span>En cartera activa</span>
                    </div>
                  </>
                )}
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-[#2E5C8A] to-[#3B76B3] rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 backdrop-blur-sm">
                <FolderOpen className="w-7 h-7 text-white" />
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-[#2E5C8A] to-[#4A90D9] rounded-full opacity-70"></div>
          </div>

          {/* Stat Card - Postulados con glass */}
          <div className="md:col-span-3 lg:col-span-4 bg-white/40 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/50 hover:bg-white/50 hover:shadow-2xl transition-all duration-300 group">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-[#2E5C8A]/80 mb-1">
                  Postulados
                </p>
                {loadingQuickStats ? (
                  <div className="flex items-center h-10">
                    <Spinner size={24} className="text-[#3B76B3]" />
                  </div>
                ) : (
                  <p className="text-4xl font-bold text-[#2E5C8A]">
                    {postuladosCount}
                  </p>
                )}
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-[#3B76B3] to-[#5BA3E0] rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                <FolderCheck className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-[#3B76B3] to-[#5BA3E0] rounded-full opacity-70"></div>
          </div>

          {/* Stat Card - Perfilados con glass */}
          <div className="md:col-span-3 lg:col-span-3 bg-white/40 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/50 hover:bg-white/50 hover:shadow-2xl transition-all duration-300 group">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-[#2E5C8A]/80 mb-1">
                  Perfilados
                </p>
                {loadingQuickStats ? (
                  <div className="flex items-center h-10">
                    <Spinner size={24} className="text-[#5BA3E0]" />
                  </div>
                ) : (
                  <p className="text-4xl font-bold text-[#2E5C8A]">
                    {perfiladosCount}
                  </p>
                )}
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-[#4A90D9] to-[#6BB6F5] rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                <ContactRound className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-[#4A90D9] to-[#6BB6F5] rounded-full opacity-70"></div>
          </div>

          {/* Formulario Card - Con glassmorphism prominente */}
          <div className="md:col-span-6 lg:col-span-8 bg-white/30 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/60 hover:bg-white/40 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#2E5C8A]/90 backdrop-blur-sm rounded-lg flex items-center justify-center shadow-md">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-[#2E5C8A]">
                Acciones Rápidas
              </h2>
            </div>

            <div className="relative group/button">
              <Button
                className="w-full h-auto bg-white/50 backdrop-blur-md hover:bg-white/70 text-gray-900 justify-start p-6 transition-all duration-300 border-2 border-white/60 hover:border-[#3B76B3]/50 shadow-lg hover:shadow-xl"
                onClick={() => window.open(FORMULARIO_PERFIL_URL, "_blank")}
              >
                <div className="flex items-center gap-4 w-full">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#2E5C8A] to-[#4A90D9] flex items-center justify-center flex-shrink-0 group-hover/button:scale-110 transition-transform duration-300 shadow-lg">
                    <FileDown className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-bold text-lg mb-1 text-[#2E5C8A]">
                      Formulario Perfil de Proyecto
                    </div>
                    <div className="text-sm text-gray-700">
                      Completa un nuevo perfil de proyecto en el formulario
                      externo
                    </div>
                  </div>
                  <ArrowRight className="w-6 h-6 text-[#3B76B3] group-hover/button:translate-x-1 transition-transform duration-300" />
                </div>
              </Button>

              <Button
                className="absolute right-0 top-0 h-full w-16 rounded-l-none rounded-r-xl bg-[#2E5C8A]/90 backdrop-blur-sm hover:bg-[#3B76B3] text-white border-2 border-[#2E5C8A]/90 hover:border-[#3B76B3] shadow-lg hover:shadow-xl transition-all duration-300"
                onClick={handleCopyLinkFormulario}
                title="Copiar enlace"
              >
                <div className="flex flex-col items-center gap-1">
                  <Copy className="h-5 w-5" />
                  <span className="text-xs font-medium">Copiar</span>
                </div>
              </Button>
            </div>
          </div>

          {/* Fondos Activos con glass */}
          <div className="md:col-span-6 lg:col-span-4 bg-white/40 backdrop-blur-lg rounded-2xl shadow-xl border border-white/50 overflow-hidden hover:bg-white/50 transition-all duration-300">
            <FondosActivosSection />
          </div>
        </div>
      </main>
    </div>
  );
}
