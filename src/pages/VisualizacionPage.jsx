import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge"; // Shadcn Badge
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
  Users, // Para el líder del proyecto
  Tag, // Para temáticas (puede ser genérico)
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  Calendar, // Para la fecha
  Zap, // Rayo para "Almacenamiento Energía"
  FlaskRound, // Para "Hidrógeno"
  Lightbulb, // Para "Contaminación Lumínica"
  XCircle,
  Info,
  Pickaxe,
  Dna,
  BatteryCharging,
  GraduationCap, // Icono para Académicos Involucrados
  ClipboardList, // Icono para Detalles del Proyecto
  Banknote, // Icono para Monto solicitado
} from "lucide-react";

// Componentes de Shadcn UI para el modal (Dialog)
import {
  Dialog,
  DialogContent,
  DialogDescription, // Puede que no necesitemos DialogDescription
  DialogHeader,
  DialogTitle,
  // DialogTrigger no se usará directamente en el botón de la Card
} from "@/components/ui/dialog";

import { Spinner } from "@/components/ui/spinner";
import funcionesService from "../api/funciones.js";
import estudiantesService from "../api/estudiantes.js";
import academicosService from "../api/academicos.js"; // Necesario para getFotosPorAcademico
import { useError } from "@/contexts/ErrorContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Importar ProjectCard desde su nuevo archivo
import ProjectCard, {
  getStatusBadge,
  getThematicBadge,
  renderInstitucionLogo,
} from "./components/ProjectCard.jsx";

export default function VisualizacionPage() {
  const [orden, setOrden] = useState("reciente");
  const [projectsData, setProjectsData] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("todos");
  const [academicosMap, setAcademicosMap] = useState({});
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

  // **** Estados para el Modal de Detalles ****
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [academicosFotos, setAcademicosFotos] = useState([]); // Fotos de académicos del proyecto seleccionado
  const academicosFotosCache = useRef({});
  const [loadingFotos, setLoadingFotos] = useState(false); // Estado de carga para las fotos

  // Helper para formatear fecha a "31 de diciembre de 2024" para el modal
  const formatDateFull = useCallback((dateString) => {
    if (!dateString) return "Sin fecha";
    try {
      const date = new Date(dateString);
      if (isNaN(date)) return "Fecha Inválida";
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

  // Función para abrir el modal y cargar fotos
  const handleCardClick = useCallback(
    async (project) => {
      setSelectedProject(project);
      setIsModalOpen(true);
      setLoadingFotos(true); // Iniciar carga de fotos
      setAcademicosFotos([]); // Limpiar fotos anteriores

      // Obtener los IDs de los académicos de este proyecto
      const academicosEnProyecto =
        academicosMap[project.id_proyecto]?.profesores || [];
      const academicosIds = academicosEnProyecto.map((p) => p.id_academico); // Extraer solo los IDs\

      const FALLBACK_PHOTO_URL =
        "https://t4.ftcdn.net/jpg/01/86/29/31/360_F_186293166_P4yk3uXQBDapbDFlR17ivpM6B1ux0fHG.jpg"; // Tu URL de placeholder

      const photosToLoad = {};
      const promisesToMake = [];
      const idsToFetch = []; // IDs que realmente necesitamos solicitar a la API
      // 1. Revisar caché para cada académico
      academicosIds.forEach((id) => {
        if (academicosFotosCache.current[id]) {
          // Si ya está en caché, usar la versión cacheada
          photosToLoad[id] = academicosFotosCache.current[id];
        } else {
          // Si no está en caché, añadir a la lista para solicitar
          idsToFetch.push(id);
          promisesToMake.push(academicosService.getFotosPorAcademico(id));
        }
      });

      setAcademicosFotos(photosToLoad); // Mostrar las fotos cacheada inmediatamente
      // Solo mostrar spinner si hay fotos nuevas por cargar
      setLoadingFotos(idsToFetch.length > 0);
      // 2. Si hay fotos que cargar de la API
      if (idsToFetch.length > 0) {
        try {
          const fotosResponses = await Promise.all(promisesToMake);
          fotosResponses.forEach((responseArray, index) => {
            const academicoId = idsToFetch[index]; // El ID del académico para esta respuesta
            const photoLink =
              responseArray && responseArray.length > 0 && responseArray[0].link
                ? responseArray[0].link
                : null;
            if (photoLink) {
              photosToLoad[academicoId] = photoLink;
              academicosFotosCache.current[academicoId] = photoLink; // Guardar en caché
            } else {
              photosToLoad[academicoId] = FALLBACK_PHOTO_URL;
              academicosFotosCache.current[academicoId] = FALLBACK_PHOTO_URL; // Guardar placeholder en caché
            }
          });
          setAcademicosFotos(photosToLoad); // Actualizar el estado con las nuevas fotos
        } catch (err) {
          console.error("Error fetching academic photos:", err);

          setErrorGlobal({
            type: "error", // Forzar a tipo error si falló
            title: "Error al cargar las fotos de los académicos.",
          });

          // En caso de error, llenar con placeholders y guardar en caché el placeholder
          idsToFetch.forEach((id) => {
            photosToLoad[id] = FALLBACK_PHOTO_URL;
            academicosFotosCache.current[id] = FALLBACK_PHOTO_URL;
          });
          setAcademicosFotos(photosToLoad);
        } finally {
          setLoadingFotos(false);
        }
      } else {
        // No había fotos que cargar, simplemente quitamos el spinner si estaba
        setLoadingFotos(false);
      }

      // Si no hay IDs de académicos en el proyecto, asegurar que el estado de fotos esté vacío y no muestre spinner
      if (academicosIds.length === 0) {
        setAcademicosFotos({});
        setLoadingFotos(false);
      }
    },
    [academicosMap, setErrorGlobal, academicosFotosCache] // Añadir academicosFotosCache a las dependencias
  );

  const fetchData = async () => {
    setLoading(true);
    setErrorLocal(null);
    setErrorGlobal(null);

    try {
      const [projectsResponse, academicosResponse] = await Promise.all([
        funcionesService.getDataInterseccionProyectos(),
        funcionesService.getAcademicosPorProyecto(),
      ]);

      const projects = Array.isArray(projectsResponse) ? projectsResponse : [];
      const academicosPorProyecto = Array.isArray(academicosResponse)
        ? academicosResponse
        : [];

      const newAcademicosMap = academicosPorProyecto.reduce((map, item) => {
        map[item.id_proyecto] = item;
        return map;
      }, {});
      setAcademicosMap(newAcademicosMap);

      // *** NUEVA LÓGICA PARA ESTUDIANTES ***
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
          return { id_proyecto: project.id_proyecto, estudiantes: [] }; // Retorna array vacío en caso de error
        }
      });

      const estudiantesResponses = await Promise.all(estudiantesPromises);

      const newEstudiantesMap = estudiantesResponses.reduce((map, item) => {
        map[item.id_proyecto] = item.estudiantes;
        return map;
      }, {});
      setEstudiantesMap(newEstudiantesMap); // <--- GUARDAR EL MAPA DE ESTUDIANTES
      // *** FIN NUEVA LÓGICA PARA ESTUDIANTES ***

      setProjectsData(projects);
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

  // Opciones únicas para los Selects (calculadas a partir de projectsData)
  const uniqueConvocatorias = [
    ...new Set(projectsData.map((p) => p.nombre_convo)),
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

  // Lógica para filtrar proyectos según el estatus seleccionado
  const filteredProjects = projectsData.filter((project) => {
    const matchesStatus =
      selectedStatus === "todos" || project.estatus === selectedStatus;
    const matchesSearch =
      searchTerm === "" ||
      project.nombre.toLowerCase().startsWith(searchTerm.toLowerCase());
    const matchesConvocatoria =
      selectedConvocatoria === "todos" ||
      project.convocatoria === selectedConvocatoria;
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

  // Lógica de ordenamiento
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    const hasDateA =
      a.fecha_postulacion && !isNaN(new Date(a.fecha_postulacion));
    const hasDateB =
      b.fecha_postulacion && !isNaN(new Date(b.fecha_postulacion));
    if (!hasDateA && !hasDateB) return 0;
    if (!hasDateA) return orden === "reciente" ? 1 : -1;
    if (!hasDateB) return orden === "reciente" ? -1 : 1;
    const dateA = new Date(a.fecha_postulacion);
    dateA.setUTCHours(0, 0, 0, 0);
    const dateB = new Date(b.fecha_postulacion);
    dateB.setUTCHours(0, 0, 0, 0);

    if (orden === "reciente") {
      return dateB.getTime() - dateA.getTime();
    } else {
      return dateA.getTime() - dateB.getTime();
    }
  });

  const totalPages = Math.ceil(sortedProjects.length / itemsPerPage);

  // Asegurarse de que la página actual no exceda el total de páginas
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    } else if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  // Calcular los proyectos de la página actual
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProjects = sortedProjects.slice(startIndex, endIndex);

  // Función para cambiar de página
  const handlePageChange = useCallback(
    (pageNumber) => {
      if (pageNumber >= 1 && pageNumber <= totalPages) {
        setCurrentPage(pageNumber);
      }
    },
    [totalPages]
  );

  // **** Obtener estudiantes para el modal ****
  const estudiantesInModal = selectedProject
    ? estudiantesMap[selectedProject.id_proyecto] || []
    : [];

  return (
    <div className="h-full bg-gradient-to-br from-slate-50 to-blue-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Visualización de Proyectos
          </h1>
          <p className="text-gray-600">
            Explora y gestiona todos tus proyectos de tu organización
          </p>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[220px]">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <Input
                  placeholder="Buscar proyectos..."
                  className="pl-10 bg-gray-50 border-gray-200"
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
                <SelectTrigger className="bg-gray-50 border-gray-200">
                  <SelectValue placeholder="Todas las instituciones" />
                </SelectTrigger>
                <SelectContent className="max-h-[400px] overflow-y-auto">
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
                <SelectTrigger className="bg-gray-50 border-gray-200">
                  <SelectValue placeholder="Todas las temáticas" />
                </SelectTrigger>
                <SelectContent className="max-h-[400px] overflow-y-auto">
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
                <SelectTrigger className="bg-gray-50 border-gray-200">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reciente">
                    <span className="flex items-center gap-2">
                      <ArrowDownWideNarrow className="w-4 h-4" />
                      Más reciente - Descendente
                    </span>
                  </SelectItem>
                  <SelectItem value="antiguo">
                    <span className="flex items-center gap-2">
                      <ArrowUpWideNarrow className="w-4 h-4" />
                      Más antiguo - Ascendente
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Tabs - Ahora manejan el estado de filtro */}
        <Tabs
          value={selectedStatus}
          onValueChange={setSelectedStatus}
          className="mb-6"
        >
          <TabsList className="flex flex-nowrap overflow-hidden bg-white border border-gray-100 rounded-md w-full">
            <TabsTrigger
              value="todos"
              className="text-xs px-1.5 py-1 sm:text-sm sm:px-3 sm:py-2 data-[state=active]:bg-[#2E5C8A] data-[state=active]:text-white"
            >
              Todos ({projectsData.length})
            </TabsTrigger>
            <TabsTrigger
              value="Postulado"
              className="text-xs px-1.5 py-1 sm:text-sm sm:px-3 sm:py-2 data-[state=active]:bg-[#2E5C8A] data-[state=active]:text-white"
            >
              Postulados (
              {projectsData.filter((p) => p.estatus === "Postulado").length})
            </TabsTrigger>
            <TabsTrigger
              value="Adjudicado"
              className="text-xs px-1.5 py-1 sm:text-sm sm:px-3 sm:py-2 data-[state=active]:bg-[#2E5C8A] data-[state=active]:text-white"
            >
              Adjudicados (
              {projectsData.filter((p) => p.estatus === "Adjudicado").length})
            </TabsTrigger>
            <TabsTrigger
              value="Perfil"
              className="text-xs px-1.5 py-1 sm:text-sm sm:px-3 sm:py-2 data-[state=active]:bg-[#2E5C8A] data-[state=active]:text-white"
            >
              Perfil (
              {projectsData.filter((p) => p.estatus === "Perfil").length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Projects Grid (Renderizado Condicional) */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Spinner size={64} className="text-[#2E5C8A]" />
          </div>
        ) : errorLocal ? (
          <Alert variant="destructive" className="bg-red-50 text-red-700">
            <XCircle className="h-5 w-5" />
            <AlertTitle>Error al cargar proyectos</AlertTitle>
            <AlertDescription>{errorLocal}</AlertDescription>
          </Alert>
        ) : sortedProjects.length === 0 ? (
          <Alert variant="default" className="bg-blue-50 text-blue-700">
            <Info className="h-5 w-5" />
            <AlertTitle>No hay proyectos</AlertTitle>
            <AlertDescription>
              No se encontraron proyectos para mostrar con el filtro actual.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {paginatedProjects.map((project) => (
              <ProjectCard
                key={project.id_proyecto}
                project={project}
                academicosDelProyecto={academicosMap[project.id_proyecto]}
                estudiantesDelProyecto={estudiantesMap[project.id_proyecto]} // <--- NUEVA PROP
                onClick={() => handleCardClick(project)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        <div className="flex justify-between items-center bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-sm text-gray-500">
            Mostrando{" "}
            {/* Si sortedProjects está vacío, el endIndex podría ser negativo o 0 */}
            {Math.min(sortedProjects.length, endIndex)} de{" "}
            {sortedProjects.length} proyectos
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || sortedProjects.length === 0}
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
                    ? "bg-[#2E5C8A] text-white hover:bg-[#1E4A6F]"
                    : ""
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
            >
              Siguiente
            </Button>
          </div>
        </div>
      </main>

      {/* **** MODAL DE DETALLES DEL PROYECTO **** */}
      {selectedProject && ( // Solo renderiza si hay un proyecto seleccionado
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent
            className="w-full max-w-md md:max-w-4xl rounded-lg p-0"
            style={{
              maxHeight: "auto",
              minHeight: "auto",
              overflowY: "auto",
              marginBottom: "2rem",
            }}
          >
            <DialogHeader>
              <div className="bg-gradient-to-r from-[#275078] to-[#5296de] px-6 py-4 rounded-t-lg">
                <DialogTitle className="text-lg md:text-xl font-bold text-white mb-1 leading-tight">
                  {selectedProject.nombre}
                </DialogTitle>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center text-s md:text-sm text-white gap-1">
                  <p>
                    <span className="font-semibold">Unidad responsable:</span>{" "}
                    {selectedProject.unidad || "Sin información"}
                  </p>
                  {getStatusBadge(selectedProject.estatus || "Sin información")}
                </div>
              </div>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3 md:gap-4 p-6 md:p-4">
              {/* Columna Izquierda: Detalles e Información de Postulación */}
              <div className="flex flex-col gap-3">
                {/* Detalles del Proyecto */}
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-[#2E5C8A]" />
                    Detalles del Proyecto
                  </h4>
                  <div className="flex items-center text-s text-gray-700 mb-1">
                    <span className="font-semibold flex-shrink-0 mr-2">
                      Temática:
                    </span>
                    {getThematicBadge(
                      selectedProject.tematica || "Sin información"
                    )}
                  </div>
                  <div className="flex items-center text-s text-gray-700 mb-1">
                    <span className="font-semibold flex-shrink-0 mr-2">
                      Institución:
                    </span>
                    <div className="flex items-center gap-2">
                      <span>
                        {selectedProject.institucion || "Sin información"}
                      </span>
                      {renderInstitucionLogo(selectedProject.institucion || "")}
                    </div>
                  </div>
                  <p className="text-s text-gray-700 mb-1">
                    <span className="font-semibold">Monto solicitado:</span>{" "}
                    {selectedProject.monto !== null &&
                    selectedProject.monto !== undefined
                      ? `$${selectedProject.monto.toLocaleString("es-CL")}`
                      : "Sin información"}
                  </p>
                  <p className="text-s text-gray-700">
                    <span className="font-semibold">Tipo de apoyo:</span>{" "}
                    {selectedProject.apoyo || "Sin información"}{" "}
                    {selectedProject.detalle_apoyo &&
                      `(${selectedProject.detalle_apoyo})`}
                  </p>
                </div>

                {/* Información de Postulación */}
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[#2E5C8A]" /> Información
                    de Registro
                  </h4>
                  <p className="text-s text-gray-700 mb-1">
                    <span className="font-semibold">Fecha de registro:</span>{" "}
                    {formatDateFull(selectedProject.fecha_postulacion)}
                  </p>
                  <p className="text-s text-gray-700">
                    <span className="font-semibold">Convocatoria:</span>{" "}
                    {selectedProject.nombre_convo || "Sin información"}{" "}
                    {selectedProject.convocatoria &&
                    selectedProject.convocatoria !== ""
                      ? `(${selectedProject.convocatoria})`
                      : ""}
                  </p>
                </div>
              </div>
              {/* Columna Derecha: Académicos y Estudiantes Involucrados */}
              <div className="flex flex-col gap-4">
                {" "}
                {/* Contenedor para ambas secciones */}
                {/* Sección de Académicos Involucrados */}
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-[#2E5C8A]" />
                    Académicos Involucrados
                  </h4>
                  {loadingFotos ? (
                    <div className="flex justify-center items-center h-16">
                      <Spinner size={24} className="text-[#2E5C8A]" />
                    </div>
                  ) : // Lógica de renderizado para académicos
                  academicosMap[selectedProject.id_proyecto]?.profesores
                      ?.length > 0 ? (
                    <div className="grid grid-cols-1 gap-y-2">
                      {academicosMap[
                        selectedProject.id_proyecto
                      ]?.profesores?.map((academico) => (
                        <div
                          key={academico.id_academico}
                          className="flex items-center gap-2"
                        >
                          <img
                            src={academicosFotos[academico.id_academico]}
                            alt={`Foto de ${
                              academico.nombre_completo || "académico"
                            }`}
                            className="w-16 h-16 object-cover rounded-full border border-gray-200 flex-shrink-0"
                          />
                          <p className="text-s font-medium text-gray-800 leading-tight">
                            {academico.nombre_completo}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    // Texto cuando no hay académicos
                    <p className="text-s text-gray-500 text-center">
                      Sin académicos involucrados.
                    </p>
                  )}
                </div>
                {/* Sección de Estudiantes Involucrados (NUEVA) */}
                {estudiantesInModal &&
                  estudiantesInModal.length > 0 && ( // Condición para renderizar la sección
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-[#2E5C8A]" />{" "}
                        {/* Icono de estudiante */}
                        Estudiantes Involucrados
                      </h4>
                      <div className="grid grid-cols-1 gap-y-1">
                        {estudiantesInModal.map((estudiante, index) => (
                          <p key={index} className="text-s text-gray-800">
                            {`${estudiante.nombre} ${
                              estudiante.a_paterno || ""
                            }`.trim()}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
              </div>{" "}
              {/* Fin de la Columna Derecha */}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
