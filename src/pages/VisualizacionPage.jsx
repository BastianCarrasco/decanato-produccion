import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Filter,
  Users,
  Tag,
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  Calendar,
  Zap,
  FlaskRound,
  Lightbulb,
  XCircle,
  Info,
  Pickaxe,
  Dna,
  BatteryCharging,
  GraduationCap,
  ClipboardList,
  Banknote,
  Eye,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Spinner } from "@/components/ui/spinner";
// Removed these imports as we'll now use a single API endpoint
// import funcionesService from "../api/funciones.js";
// import estudiantesService from "../api/estudiantes.js";
// import academicosService from "../api/academicos.js";
import { useError } from "@/contexts/ErrorContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import ProjectCard, {
  getStatusBadge,
  getThematicBadge,
  renderInstitucionLogo,
} from "./components/ProjectCard.jsx";

export default function VisualizacionPage() {
  const [orden, setOrden] = useState("reciente");
  const [projectsData, setProjectsData] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("todos");
  // academicosMap will now be directly populated from the denormalized data
  const [academicosMap, setAcademicosMap] = useState({});
  // estudiantesMap will now be directly populated from the denormalized data
  const [estudiantesMap, setEstudiantesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [errorLocal, setErrorLocal] = useState(null);
  const { setError: setErrorGlobal } = useError();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInstitucion, setSelectedInstitucion] = useState("todos");
  const [selectedConvocatoria, setSelectedConvocatoria] = useState("todos");
  const [selectedTematica, setSelectedTematica] = useState("todos");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [academicosFotos, setAcademicosFotos] = useState({}); // Changed to object for easier lookup
  const academicosFotosCache = useRef({});
  const [loadingFotos, setLoadingFotos] = useState(false);

  const formatDateFull = useCallback((dateString) => {
    if (!dateString) return "Sin fecha";
    try {
      // Ensure dateString is compatible with Date constructor
      // For "sept-24" format, we might need a more robust parsing logic if the year isn't inferable
      // Assuming a full date string like "2024-09-01" or "September 1, 2024" for now
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        // Use getTime() to check for invalid dates
        // Attempt to parse 'MMM-YY' format if it's the issue
        const parts = dateString.split("-");
        if (parts.length === 2) {
          const monthMap = {
            ene: 0,
            feb: 1,
            mar: 2,
            abr: 3,
            may: 4,
            jun: 5,
            jul: 6,
            ago: 7,
            sep: 8,
            oct: 9,
            nov: 10,
            dic: 11,
          };
          const month = monthMap[parts[0].toLowerCase()];
          // Assuming "24" means "2024", adjust century as needed
          const year = 2000 + parseInt(parts[1], 10);
          if (month !== undefined && !isNaN(year)) {
            const parsedDate = new Date(year, month, 1);
            if (!isNaN(parsedDate.getTime())) {
              const options = {
                year: "numeric",
                month: "long",
                day: "numeric",
              };
              return parsedDate.toLocaleDateString("es-CL", options);
            }
          }
        }
        return "Fecha Inválida";
      }
      const options = { year: "numeric", month: "long", day: "numeric" };
      return date.toLocaleDateString("es-CL", options);
    } catch (e) {
      console.warn(
        "Invalid date string for modal (full format):",
        dateString,
        e
      );
      return "Fecha Inválida";
    }
  }, []);

  const MONGO_BACKEND_API_URL = import.meta.env.VITE_URL_WALLET;

  const handleCardClick = useCallback(
    async (project) => {
      setSelectedProject(project);
      setIsModalOpen(true);
      setLoadingFotos(true); // Se puede mantener para un breve "flash" de carga si se desea, aunque no habrá fetch real.

      const academicosInProject =
        academicosMap[project.id_proyecto]?.profesores || [];

      const FALLBACK_PHOTO_URL =
        "https://t4.ftcdn.net/jpg/01/86/29/31/360_F_186293166_P4yk3uXQBDapbDFlR17ivpM6B1ux0fHG.jpg";

      const photosForModal = {};
      academicosInProject.forEach((academico) => {
        photosForModal[academico.id_academico] =
          academico.link_foto || FALLBACK_PHOTO_URL;
      });

      setAcademicosFotos(photosForModal);
      setLoadingFotos(false); // No hay llamadas asíncronas para fotos, así que se desactiva inmediatamente.

      if (academicosInProject.length === 0) {
        setAcademicosFotos({});
      }
    },
    [academicosMap] // Depende de academicosMap para asegurar que la información esté actualizada
  );

  const fetchData = async () => {
    setLoading(true);
    setErrorLocal(null);
    setErrorGlobal(null);

    try {
      const response = await fetch(MONGO_BACKEND_API_URL);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      const fetchedProjects = Array.isArray(result.data) ? result.data : [];

      const newAcademicosMap = {};
      const newEstudiantesMap = {};

      fetchedProjects.forEach((project) => {
        const projectAcademicos = [];
        if (project["Académic@/s-Líder"]) {
          projectAcademicos.push({
            id_academico: project._id + "-lider",
            nombre_completo: project["Académic@/s-Líder"],
            link_foto: project.link_foto_lider, // <--- ESTO ES CLAVE
          });
        }
        if (project["Académic@/s-Partner"]) {
          const partners = project["Académic@/s-Partner"]
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean);
          partners.forEach((partnerName, index) => {
            projectAcademicos.push({
              id_academico: project._id + "-partner-" + index,
              nombre_completo: partnerName,
              link_foto: project.link_foto_partner, // <--- ESTO TAMBIÉN ES CLAVE
            });
          });
        }
        newAcademicosMap[project._id] = {
          id_proyecto: project._id,
          profesores: projectAcademicos,
        };

        // ... (estudiantesMap creation remains the same)
        const projectEstudiantes = [];
        if (project.Estudiantes) {
          const studentNames = project.Estudiantes.split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          studentNames.forEach((name, index) => {
            projectEstudiantes.push({
              id_estudiante: project._id + "-estudiante-" + index,
              nombre: name,
              a_paterno: "",
            });
          });
        }
        newEstudiantesMap[project._id] = projectEstudiantes;
      });

      setAcademicosMap(newAcademicosMap);
      setEstudiantesMap(newEstudiantesMap);

      // ... (transformedProjects creation remains the same)
      const transformedProjects = fetchedProjects.map((project) => ({
        id_proyecto: project._id,
        nombre: project["Nombre Proyecto/Perfil Proyecto"],
        tematica: project["Temática"],
        estatus: project["Estatus"],
        tipo_apoyo: project["Tipo Apoyo"],
        detalle_apoyo: project["Detalle Apoyo"],
        monto: project["Monto Proyecto MM$"],
        academico_lider: project["Académic@/s-Líder"],
        academico_partner: project["Académic@/s-Partner"],
        estudiantes: project["Estudiantes"],
        unidad: project["Unidad Académica"],
        unidad_partner: project["Unidad Académica ++"],
        nombre_convo: project["Nombre Convocatoria a la que se postuló"],
        convocatoria: project["Tipo Convocatoria"],
        institucion: project["Institucion Convocatoria"],
        fecha_postulacion: project["Fecha Postulación"],
        comentarios: project["Comentarios"],
        validar: project["VALIDAR"],
        link_foto_lider: project.link_foto_lider,
        link_foto_partner: project.link_foto_partner,
      }));

      setProjectsData(transformedProjects);
    } catch (err) {
      console.error("Error fetching data for VisualizacionPage:", err);
      setErrorLocal(
        err.message || "Error desconocido al cargar los proyectos."
      );
      setErrorGlobal({
        type: "error",
        title: "Error al cargar los proyectos",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const uniqueConvocatorias = [
    ...new Set(projectsData.map((p) => p.nombre_convo)), // Changed to nombre_convo as per transformation
  ]
    .filter(Boolean)
    .sort();
  const uniqueTematicas = [...new Set(projectsData.map((p) => p.tematica))]
    .filter(Boolean)
    .sort();
  const uniqueInstituciones = [
    ...new Set(projectsData.map((p) => p.institucion)),
  ]
    .filter(Boolean)
    .sort();

  const filteredProjects = projectsData.filter((project) => {
    const matchesStatus =
      selectedStatus === "todos" || project.estatus === selectedStatus;
    const matchesSearch =
      searchTerm === "" ||
      project.nombre.toLowerCase().startsWith(searchTerm.toLowerCase());
    const matchesConvocatoria =
      selectedConvocatoria === "todos" ||
      project.nombre_convo === selectedConvocatoria; // Changed to nombre_convo
    const matchesTematica =
      selectedTematica === "todos" || project.tematica === selectedTematica;
    const matchesInstitucion =
      selectedInstitucion === "todos" ||
      project.institucion === selectedInstitucion;

    return (
      matchesStatus &&
      matchesSearch &&
      matchesConvocatoria &&
      matchesTematica &&
      matchesInstitucion
    );
  });

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    // We need to parse the "Fecha Postulación" which might be "sept-24"
    const parseDate = (dateString) => {
      if (!dateString) return null;
      // Handle "MMM-YY" format
      const parts = dateString.split("-");
      if (parts.length === 2) {
        const monthMap = {
          ene: 0,
          feb: 1,
          mar: 2,
          abr: 3,
          may: 4,
          jun: 5,
          jul: 6,
          ago: 7,
          sep: 8,
          oct: 9,
          nov: 10,
          dic: 11,
        };
        const month = monthMap[parts[0].toLowerCase()];
        const year = 2000 + parseInt(parts[1], 10); // Assuming 20xx for "xx" year
        if (month !== undefined && !isNaN(year)) {
          return new Date(year, month, 1); // Day 1 of the month
        }
      }
      // Fallback for full date strings if they appear
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
    };

    const dateA = parseDate(a.fecha_postulacion);
    const dateB = parseDate(b.fecha_postulacion);

    const hasDateA = dateA !== null;
    const hasDateB = dateB !== null;

    if (!hasDateA && !hasDateB) return 0;
    if (!hasDateA) return orden === "reciente" ? 1 : -1;
    if (!hasDateB) return orden === "reciente" ? -1 : 1;

    // Set to UTC start of day for consistent comparison, though month precision might be enough
    dateA.setUTCHours(0, 0, 0, 0);
    dateB.setUTCHours(0, 0, 0, 0);

    if (orden === "reciente") {
      return dateB.getTime() - dateA.getTime();
    } else {
      return dateA.getTime() - dateB.getTime();
    }
  });

  const totalPages = Math.ceil(sortedProjects.length / itemsPerPage);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    } else if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProjects = sortedProjects.slice(startIndex, endIndex);

  const handlePageChange = useCallback(
    (pageNumber) => {
      if (pageNumber >= 1 && pageNumber <= totalPages) {
        setCurrentPage(pageNumber);
      }
    },
    [totalPages]
  );

  const estudiantesInModal = selectedProject
    ? estudiantesMap[selectedProject.id_proyecto] || []
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-200 via-sky-300 to-blue-200">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2E5C8A] via-[#3B76B3] to-[#4A90D9] p-8 mb-8 shadow-2xl">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/30">
                <Eye className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white tracking-tight">
                  Visualización de Proyectos
                </h1>
                <p className="text-blue-100 text-lg">
                  Explora y gestiona todos los proyectos de tu organización
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/40 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-6 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[220px]">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#2E5C8A]"
                  size={18}
                />
                <Input
                  placeholder="Buscar proyectos..."
                  className="pl-10 bg-white/70 backdrop-blur-sm border border-white/50 focus:bg-white/90 focus:border-[#4A90D9] focus:ring-1 focus:ring-[#4A90D9] focus:outline-none transition-all shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Select
                value={selectedInstitucion}
                onValueChange={setSelectedInstitucion}
              >
                <SelectTrigger className="bg-white/60 backdrop-blur-md border-white/60 hover:bg-white/80 transition-all">
                  <SelectValue placeholder="Todas las instituciones" />
                </SelectTrigger>
                <SelectContent className="max-h-[400px] overflow-y-auto bg-white/95 backdrop-blur-xl">
                  <SelectItem value="todos">Todas las instituciones</SelectItem>
                  {uniqueInstituciones.map((institucion) => (
                    <SelectItem key={institucion} value={institucion}>
                      {institucion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select
                value={selectedTematica}
                onValueChange={setSelectedTematica}
              >
                <SelectTrigger className="bg-white/60 backdrop-blur-md border-white/60 hover:bg-white/80 transition-all">
                  <SelectValue placeholder="Todas las temáticas" />
                </SelectTrigger>
                <SelectContent className="max-h-[400px] overflow-y-auto bg-white/95 backdrop-blur-xl">
                  <SelectItem value="todos">Todas las temáticas</SelectItem>
                  {uniqueTematicas.map((tem) => (
                    <SelectItem key={tem} value={tem}>
                      {tem}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={orden} onValueChange={setOrden}>
                <SelectTrigger className="bg-white/60 backdrop-blur-md border-white/60 hover:bg-white/80 transition-all">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent className="bg-white/95 backdrop-blur-xl">
                  <SelectItem value="reciente">
                    <span className="flex items-center gap-2">
                      <ArrowDownWideNarrow className="w-4 h-4" />
                      Más reciente
                    </span>
                  </SelectItem>
                  <SelectItem value="antiguo">
                    <span className="flex items-center gap-2">
                      <ArrowUpWideNarrow className="w-4 h-4" />
                      Más antiguo
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          value={selectedStatus}
          onValueChange={setSelectedStatus}
          className="mb-6"
        >
          <TabsList className="flex flex-nowrap overflow-x-auto bg-white/40 backdrop-blur-lg border border-white/50 rounded-xl p-1 shadow-lg">
            <TabsTrigger
              value="todos"
              className="text-xs px-3 py-2 sm:text-sm sm:px-4 sm:py-2.5 text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#2E5C8A] data-[state=active]:to-[#3B76B3] data-[state=active]:text-white rounded-lg transition-all duration-300"
            >
              Todos ({projectsData.length})
            </TabsTrigger>
            <TabsTrigger
              value="Postulado"
              className="text-xs px-3 py-2 sm:text-sm sm:px-4 sm:py-2.5 text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#2E5C8A] data-[state=active]:to-[#3B76B3] data-[state=active]:text-white rounded-lg transition-all duration-300"
            >
              Postulados (
              {projectsData.filter((p) => p.estatus === "Postulado").length})
            </TabsTrigger>
            <TabsTrigger
              value="Adjudicado"
              className="text-xs px-3 py-2 sm:text-sm sm:px-4 sm:py-2.5 text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#2E5C8A] data-[state=active]:to-[#3B76B3] data-[state=active]:text-white rounded-lg transition-all duration-300"
            >
              Adjudicados (
              {projectsData.filter((p) => p.estatus === "Adjudicado").length})
            </TabsTrigger>
            <TabsTrigger
              value="Perfil"
              className="text-xs px-3 py-2 sm:text-sm sm:px-4 sm:py-2.5 text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#2E5C8A] data-[state=active]:to-[#3B76B3] data-[state=active]:text-white rounded-lg transition-all duration-300"
            >
              Perfil (
              {projectsData.filter((p) => p.estatus === "Perfil").length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Projects Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="bg-white/40 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-white/50">
              <Spinner size={64} className="text-[#2E5C8A]" />
            </div>
          </div>
        ) : errorLocal ? (
          <Alert
            variant="destructive"
            className="bg-red-50/80 backdrop-blur-md text-red-700 border-red-200"
          >
            <XCircle className="h-5 w-5" />
            <AlertTitle>Error al cargar proyectos</AlertTitle>
            <AlertDescription>{errorLocal}</AlertDescription>
          </Alert>
        ) : sortedProjects.length === 0 ? (
          <div className="bg-white/40 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-12 text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Info className="h-10 w-10 text-[#2E5C8A]" />
            </div>
            <h3 className="text-xl font-bold text-[#2E5C8A] mb-2">
              No hay proyectos
            </h3>
            <p className="text-gray-600">
              No se encontraron proyectos con los filtros aplicados
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {paginatedProjects.map((project) => (
              <ProjectCard
                key={project.id_proyecto}
                project={project}
                academicosDelProyecto={academicosMap[project.id_proyecto]} // Still pass this if ProjectCard expects it
                estudiantesDelProyecto={estudiantesMap[project.id_proyecto]} // Still pass this if ProjectCard expects it
                onClick={() => handleCardClick(project)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        <div className="flex justify-between items-center bg-white/40 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-4">
          <div className="text-sm font-medium text-[#2E5C8A]">
            Mostrando {Math.min(sortedProjects.length, endIndex)} de{" "}
            {sortedProjects.length} proyectos
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || sortedProjects.length === 0}
              className="bg-white/60 backdrop-blur-md border-white/60 hover:bg-white/80 disabled:opacity-50"
            >
              Anterior
            </Button>
            {Array.from({ length: totalPages }, (_, i) => (
              <Button
                key={i + 1}
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(i + 1)}
                className={
                  currentPage === i + 1
                    ? "bg-gradient-to-r from-[#2E5C8A] to-[#3B76B3] text-white border-none hover:from-[#1E4A6F] hover:to-[#2E5C8A]"
                    : "bg-white/60 backdrop-blur-md border-white/60 hover:bg-white/80"
                }
              >
                {i + 1}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={
                currentPage === totalPages || sortedProjects.length === 0
              }
              className="bg-white/60 backdrop-blur-md border-white/60 hover:bg-white/80 disabled:opacity-50"
            >
              Siguiente
            </Button>
          </div>
        </div>
      </main>

      {/* Modal */}
      {selectedProject && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent
            className="w-full max-w-md md:max-w-6xl rounded-3xl p-0 bg-white/70 backdrop-blur-xl border-2 border-white/60 shadow-2xl overflow-hidden"
            style={{ maxHeight: "90vh", overflowY: "auto" }}
          >
            <div className="relative overflow-hidden bg-gradient-to-br from-[#1e3a5f] via-[#2E5C8A] to-[#3B76B3] px-8 py-8">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-white/10 rounded-full blur-3xl"></div>

              <div className="relative z-10 space-y-4">
                <div>
                  <DialogTitle className="text-2xl md:text-3xl font-bold text-white mb-3 leading-tight">
                    {selectedProject.nombre}
                  </DialogTitle>

                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    {getStatusBadge(
                      selectedProject.estatus || "Sin información"
                    )}
                    {getThematicBadge(
                      selectedProject.tematica || "Sin información"
                    )}
                    {selectedProject.institucion && (
                      <Badge className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-white/20 backdrop-blur-md text-white border border-white/30">
                        {renderInstitucionLogo(selectedProject.institucion)}
                        <span>{selectedProject.institucion}</span>
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-white/15 backdrop-blur-md rounded-xl p-3 border border-white/25">
                    <p className="text-xs text-blue-100 font-medium mb-1 uppercase tracking-wide">
                      Unidad Responsable
                    </p>
                    <p className="text-white font-semibold text-sm">
                      {selectedProject.unidad || "Sin información"}
                      {selectedProject.unidad_partner && (
                        <span>, {selectedProject.unidad_partner}</span>
                      )}
                    </p>
                  </div>

                  <div className="bg-white/15 backdrop-blur-md rounded-xl p-3 border border-white/25">
                    <p className="text-xs text-blue-100 font-medium mb-1 uppercase tracking-wide">
                      Monto Solicitado
                    </p>
                    <p className="text-white font-bold text-lg">
                      {selectedProject.monto !== null &&
                      selectedProject.monto !== undefined
                        ? `$${selectedProject.monto.toLocaleString("es-CL")}`
                        : "Sin información"}
                    </p>
                  </div>

                  <div className="bg-white/15 backdrop-blur-md rounded-xl p-3 border border-white/25">
                    <p className="text-xs text-blue-100 font-medium mb-1 uppercase tracking-wide">
                      Fecha de Registro
                    </p>
                    <p className="text-white font-semibold text-sm">
                      {formatDateFull(selectedProject.fecha_postulacion)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-6 bg-white/40">
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-[#1a3d5c] flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#2E5C8A] rounded-lg flex items-center justify-center">
                    <ClipboardList className="h-5 w-5 text-white" />
                  </div>
                  Información del Proyecto
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-gray-200 hover:bg-white transition-all shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-[#2E5C8A] rounded-xl flex items-center justify-center flex-shrink-0">
                        <Banknote className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-600 font-medium mb-2 uppercase tracking-wide">
                          Tipo de Apoyo
                        </p>
                        <p className="text-sm font-bold text-[#1a3d5c]">
                          {selectedProject.tipo_apoyo || "Sin información"}
                        </p>
                        {selectedProject.detalle_apoyo && (
                          <p className="text-xs text-gray-700 mt-1">
                            {selectedProject.detalle_apoyo}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-gray-200 hover:bg-white transition-all shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-[#2E5C8A] rounded-xl flex items-center justify-center flex-shrink-0">
                        <Calendar className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-600 font-medium mb-2 uppercase tracking-wide">
                          Convocatoria
                        </p>
                        <p className="text-sm font-bold text-[#1a3d5c]">
                          {selectedProject.nombre_convo || "Sin información"}
                        </p>
                        {selectedProject.convocatoria && ( // This is 'Tipo Convocatoria'
                          <p className="text-xs text-gray-700 mt-1">
                            {selectedProject.convocatoria}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-[#1a3d5c] flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#2E5C8A] rounded-lg flex items-center justify-center">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  Equipo del Proyecto
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 bg-[#2E5C8A] rounded-lg flex items-center justify-center">
                        <GraduationCap className="h-5 w-5 text-white" />
                      </div>
                      <h4 className="text-lg font-bold text-[#1a3d5c]">
                        Académicos
                      </h4>
                    </div>

                    {loadingFotos ? (
                      <div className="flex justify-center items-center h-24">
                        <Spinner size={32} className="text-[#2E5C8A]" />
                      </div>
                    ) : academicosMap[selectedProject.id_proyecto]?.profesores
                        ?.length > 0 ? (
                      <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                        {academicosMap[
                          selectedProject.id_proyecto
                        ]?.profesores?.map((academico) => (
                          <div
                            key={academico.id_academico} // Use the generated id_academico
                            className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200 hover:bg-white transition-all"
                          >
                            <img
                              src={
                                academicosFotos[academico.id_academico] ||
                                academicosFotosCache.current[
                                  academico.id_academico
                                ] ||
                                "https://t4.ftcdn.net/jpg/01/86/29/31/360_F_186293166_P4yk3uXQBDapbDFlR17ivpM6B1ux0fHG.jpg"
                              }
                              alt={`Foto de ${
                                academico.nombre_completo || "académico"
                              }`}
                              className="w-14 h-14 object-cover rounded-full border-2 border-gray-200 shadow-md flex-shrink-0"
                            />
                            <div>
                              <p className="text-sm font-semibold text-[#1a3d5c] leading-tight">
                                {academico.nombre_completo}
                              </p>
                              <p className="text-xs text-gray-600">Académico</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10 bg-gray-50 rounded-xl border border-gray-200">
                        <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 font-medium">
                          Sin académicos
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 bg-[#2E5C8A] rounded-lg flex items-center justify-center">
                        <Users className="h-5 w-5 text-white" />
                      </div>
                      <h4 className="text-lg font-bold text-[#1a3d5c]">
                        Estudiantes
                      </h4>
                    </div>

                    {estudiantesInModal && estudiantesInModal.length > 0 ? (
                      <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                        {estudiantesInModal.map((estudiante) => (
                          <div
                            key={estudiante.id_estudiante} // Use the generated id_estudiante
                            className="flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-xl border border-gray-200 hover:bg-white transition-all"
                          >
                            <div className="w-11 h-11 bg-[#2E5C8A] rounded-full flex items-center justify-center text-white font-bold text-base shadow-md">
                              {estudiante.nombre.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-[#1a3d5c]">
                                {`${estudiante.nombre} ${
                                  estudiante.a_paterno || ""
                                }`.trim()}
                              </p>
                              <p className="text-xs text-gray-600">
                                Estudiante
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10 bg-gray-50 rounded-xl border border-gray-200">
                        <Users className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 font-medium">
                          Sin estudiantes
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
