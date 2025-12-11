import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Eye,
  Edit3,
  RefreshCw,
  Check,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle,
  XCircle as XCircleIcon,
  Users,
  Calendar,
  CircleDollarSign,
  GraduationCap,
  ClipboardList,
  Filter,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SheetProjectCard, {
  getStatusBadge,
  getThematicBadge,
  getValidationBadge,
} from "./components/SheetProjectCard.jsx";

export default function ModificarCartera() {
  const [currentStep, setCurrentStep] = useState(1);
  const [projectsData, setProjectsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [updateStatus, setUpdateStatus] = useState(null);
  const [updateMessage, setUpdateMessage] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  const [validationFilter, setValidationFilter] = useState("todos");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  const BACKEND_API_URL = import.meta.env.VITE_URL_BACKEND;
  const MONGO_BACKEND_API_URL = import.meta.env.VITE_URL_WALLET;
  const SPREADSHEET_ID = import.meta.env.VITE_SPREADSHEET_ID;
  const spreadsheetLink = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit?usp=sharing`;

  const steps = [
    {
      number: 1,
      title: "Previsualizar Actual",
      description: "Ver todos los proyectos",
      icon: Eye,
      optional: false,
    },
    {
      number: 2,
      title: "Editar Cartera",
      description: "Modificar en Google Sheets",
      icon: Edit3,
      optional: false,
    },
    {
      number: 3,
      title: "Actualizar BD",
      description: "Sincronizar cambios",
      icon: RefreshCw,
      optional: false,
    },
    {
      number: 4,
      title: "Previsualizar Nuevo",
      description: "Ver proyectos validados",
      icon: Check,
      optional: false,
    },
  ];

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(BACKEND_API_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProjectsData(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateDatabase = async () => {
    setUpdateStatus("loading");
    setUpdateMessage("Eliminando datos antiguos...");

    try {
      const deleteRes = await fetch(MONGO_BACKEND_API_URL, {
        method: "DELETE",
      });
      if (!deleteRes.ok)
        throw new Error(`Error al eliminar datos: ${deleteRes.status}`);

      setUpdateMessage("Filtrando proyectos validados...");

      await fetchData();
      const validatedProjects = projectsData.filter(
        (project) => String(project["VALIDAR"]).toLowerCase() === "true"
      );

      setUpdateMessage("Insertando proyectos en la base de datos...");

      const postRes = await fetch(MONGO_BACKEND_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validatedProjects),
      });
      if (!postRes.ok)
        throw new Error(`Error al insertar datos: ${postRes.status}`);

      setUpdateMessage("Verificando sincronización...");

      const countRes = await fetch(`${MONGO_BACKEND_API_URL}analisis-completo`);
      const countData = await countRes.json();

      if (countData.totalProyectos === validatedProjects.length) {
        setUpdateStatus("success");
        setUpdateMessage(
          `✅ Base de datos actualizada correctamente. ${validatedProjects.length} proyectos sincronizados.`
        );
      } else {
        throw new Error("El número de proyectos no coincide");
      }
    } catch (err) {
      setUpdateStatus("error");
      setUpdateMessage(`❌ Error: ${err.message}`);
    }
  };

  const handleProjectClick = (project) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  const formatDateFull = (dateString) => {
    if (!dateString) return "Sin fecha";
    try {
      const date = new Date(dateString);
      if (isNaN(date)) return "Fecha Inválida";
      const options = { year: "numeric", month: "long", day: "numeric" };
      return date.toLocaleDateString("es-CL", options);
    } catch (e) {
      return "Fecha Inválida";
    }
  };

  useEffect(() => {
    if (currentStep === 1 || currentStep === 4) {
      fetchData();
    }
  }, [currentStep]);

  useEffect(() => {
    setCurrentPage(1);
  }, [validationFilter]);

  const allProjects = projectsData;
  const validatedProjects = projectsData.filter(
    (project) => String(project["VALIDAR"]).toLowerCase() === "true"
  );
  const notValidatedProjects = projectsData.filter(
    (project) => String(project["VALIDAR"]).toLowerCase() !== "true"
  );

  const getFilteredProjects = () => {
    switch (validationFilter) {
      case "validados":
        return validatedProjects;
      case "no-validados":
        return notValidatedProjects;
      default:
        return allProjects;
    }
  };

  const filteredProjects = getFilteredProjects();

  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProjects = filteredProjects.slice(startIndex, endIndex);

  const handlePageChange = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
      const halfPageHeight = window.innerHeight / 2;
      window.scrollTo({ top: halfPageHeight, behavior: "smooth" });
    }
  };

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
                <FileSpreadsheet className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white tracking-tight">
                  Modificar Cartera
                </h1>
                <p className="text-blue-100 text-lg">
                  Gestiona y actualiza los proyectos de tu cartera pública
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stepper */}
        <div className="bg-white/40 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-8 mb-8">
          <div className="relative">
            <div className="flex items-center justify-between relative z-10">
              {steps.map((step, index) => (
                <div key={step.number} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <button
                      onClick={() => setCurrentStep(step.number)}
                      className={`relative w-16 h-16 rounded-full flex flex-col items-center justify-center transition-all duration-300 ${
                        currentStep === step.number
                          ? "bg-gradient-to-br from-[#2E5C8A] to-[#3B76B3] shadow-lg scale-110"
                          : currentStep > step.number
                          ? "bg-green-500 shadow-md"
                          : "bg-white/60 backdrop-blur-md border-2 border-white/50"
                      }`}
                    >
                      <span
                        className={`text-xs font-bold mb-1 ${
                          currentStep >= step.number
                            ? "text-white"
                            : "text-[#2E5C8A]"
                        }`}
                      >
                        {step.number}
                      </span>
                      <step.icon
                        className={`h-5 w-5 ${
                          currentStep >= step.number
                            ? "text-white"
                            : "text-[#2E5C8A]"
                        }`}
                      />
                      {step.optional && (
                        <span className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full">
                          Opcional
                        </span>
                      )}
                    </button>

                    <div className="mt-3 text-center max-w-[140px]">
                      <p
                        className={`font-bold text-sm ${
                          currentStep === step.number
                            ? "text-[#2E5C8A]"
                            : "text-gray-600"
                        }`}
                      >
                        {step.title}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {index < steps.length - 1 && (
                    <div className="flex-1 h-1 mx-4 mb-16 rounded-full bg-gradient-to-r from-transparent via-white/50 to-transparent">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          currentStep > step.number
                            ? "bg-gradient-to-r from-green-400 to-green-600"
                            : "bg-white/30"
                        }`}
                        style={{
                          width: currentStep > step.number ? "100%" : "0%",
                        }}
                      ></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Contenido del Paso Actual */}
        <div className="bg-white/40 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-8">
          {/* PASO 1 */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-[#1a3d5c] flex items-center gap-3">
                    <Eye className="h-7 w-7 text-[#2E5C8A]" />
                    Todos los Proyectos Registrados
                  </h2>
                  <p className="text-gray-600 mt-2">
                    Vista completa de proyectos validados y no validados
                  </p>
                </div>
                <Button
                  onClick={fetchData}
                  disabled={loading}
                  className="bg-[#2E5C8A] hover:bg-[#1e4a6f] text-white"
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                  />
                  Recargar vista
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white/60 backdrop-blur-md rounded-xl p-4 border border-white/50">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                      <Eye className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-[#2E5C8A]">
                        {allProjects.length}
                      </p>
                      <p className="text-sm text-gray-600">Total Proyectos</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/60 backdrop-blur-md rounded-xl p-4 border border-white/50">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">
                        {validatedProjects.length}
                      </p>
                      <p className="text-sm text-gray-600">Validados</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/60 backdrop-blur-md rounded-xl p-4 border border-white/50">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                      <XCircleIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-600">
                        {notValidatedProjects.length}
                      </p>
                      <p className="text-sm text-gray-600">No Validados</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/60 backdrop-blur-md rounded-xl p-4 border border-white/50">
                <div className="flex items-center gap-3 mb-4">
                  <Filter className="h-5 w-5 text-[#2E5C8A]" />
                  <h3 className="font-bold text-[#1a3d5c]">
                    Filtrar por estado de validación
                  </h3>
                </div>
                <Tabs
                  value={validationFilter}
                  onValueChange={setValidationFilter}
                >
                  <TabsList className="bg-white/60 backdrop-blur-lg border border-white/50 rounded-xl p-1">
                    <TabsTrigger
                      value="todos"
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#2E5C8A] data-[state=active]:to-[#3B76B3] data-[state=active]:text-white"
                    >
                      Todos ({allProjects.length})
                    </TabsTrigger>
                    <TabsTrigger
                      value="validados"
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-green-600 data-[state=active]:text-white"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Validados ({validatedProjects.length})
                    </TabsTrigger>
                    <TabsTrigger
                      value="no-validados"
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-red-600 data-[state=active]:text-white"
                    >
                      <XCircleIcon className="h-4 w-4 mr-2" />
                      No Validados ({notValidatedProjects.length})
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <Spinner size={64} className="text-[#2E5C8A]" />
                </div>
              ) : error ? (
                <Alert
                  variant="destructive"
                  className="bg-red-50/80 backdrop-blur-md"
                >
                  <AlertCircle className="h-5 w-5" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : filteredProjects.length === 0 ? (
                <Alert className="bg-blue-50/80 backdrop-blur-md">
                  <AlertCircle className="h-5 w-5" />
                  <AlertTitle>Sin proyectos</AlertTitle>
                  <AlertDescription>
                    No hay proyectos con el filtro seleccionado
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                    {paginatedProjects.map((project, index) => (
                      <SheetProjectCard
                        key={index}
                        project={project}
                        onClick={() => handleProjectClick(project)}
                        showValidationBadge={true}
                      />
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex justify-between items-center bg-white/60 backdrop-blur-md rounded-xl p-4 border border-white/50">
                      <div className="text-sm font-medium text-[#2E5C8A]">
                        Mostrando {startIndex + 1} a{" "}
                        {Math.min(endIndex, filteredProjects.length)} de{" "}
                        {filteredProjects.length} proyectos
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="bg-white/60 backdrop-blur-md border-white/60 hover:bg-white/80 disabled:opacity-50"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>

                        {Array.from(
                          { length: Math.min(totalPages, 5) },
                          (_, i) => {
                            let pageNumber;
                            if (totalPages <= 5) {
                              pageNumber = i + 1;
                            } else if (currentPage <= 3) {
                              pageNumber = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNumber = totalPages - 4 + i;
                            } else {
                              pageNumber = currentPage - 2 + i;
                            }

                            return (
                              <Button
                                key={pageNumber}
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(pageNumber)}
                                className={
                                  currentPage === pageNumber
                                    ? "bg-gradient-to-r from-[#2E5C8A] to-[#3B76B3] text-white border-none"
                                    : "bg-white/60 backdrop-blur-md border-white/60 hover:bg-white/80"
                                }
                              >
                                {pageNumber}
                              </Button>
                            );
                          }
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="bg-white/60 backdrop-blur-md border-white/60 hover:bg-white/80 disabled:opacity-50"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* PASO 2 */}
          {currentStep === 2 && (
            <div className="text-center space-y-8 py-12">
              <div className="w-24 h-24 bg-[#2E5C8A] rounded-2xl flex items-center justify-center mx-auto shadow-xl">
                <Edit3 className="h-12 w-12 text-white" />
              </div>

              <div>
                <h2 className="text-3xl font-bold text-[#1a3d5c] mb-4">
                  Editar Proyectos en Google Sheets
                </h2>
                <p className="text-gray-600 max-w-2xl mx-auto text-lg">
                  Haz clic en el botón de abajo para abrir la hoja de cálculo
                  donde puedes editar los datos de los proyectos. Recuerda
                  marcar como{" "}
                  <span className="font-bold text-[#2E5C8A]">"TRUE"</span> en la
                  columna VALIDAR los proyectos que quieres mostrar
                  públicamente.
                </p>
              </div>

              <a
                href={spreadsheetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-gradient-to-r from-[#2E5C8A] to-[#3B76B3] hover:from-[#1e4a6f] hover:to-[#2E5C8A] text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                <ExternalLink className="h-6 w-6" />
                Abrir Google Sheets
              </a>

              <div className="bg-yellow-50/80 backdrop-blur-md border border-yellow-200 rounded-xl p-6 max-w-2xl mx-auto">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="font-bold text-yellow-900 mb-2">
                      Importante: Después de editar
                    </p>
                    <p className="text-yellow-800 text-sm">
                      Una vez que hayas terminado de editar en Google Sheets,
                      asegúrate de avanzar al siguiente paso para actualizar la
                      base de datos y sincronizar los cambios.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PASO 3 */}
          {currentStep === 3 && (
            <div className="text-center space-y-8 py-12">
              <div className="w-24 h-24 bg-[#2E5C8A] rounded-2xl flex items-center justify-center mx-auto shadow-xl">
                <RefreshCw className="h-12 w-12 text-white" />
              </div>

              <div>
                <h2 className="text-3xl font-bold text-[#1a3d5c] mb-4">
                  Actualizar Base de Datos
                </h2>
                <p className="text-gray-600 max-w-2xl mx-auto text-lg">
                  Sincroniza los cambios realizados en Google Sheets con la base
                  de datos. Este proceso eliminará los datos antiguos e
                  insertará los proyectos nuevos.
                </p>
              </div>

              {updateStatus === null && (
                <Button
                  onClick={updateDatabase}
                  size="lg"
                  className="bg-gradient-to-r from-[#2E5C8A] to-[#3B76B3] hover:from-[#1e4a6f] hover:to-[#2E5C8A] text-white font-bold py-4 px-8 text-lg shadow-lg"
                >
                  <RefreshCw className="h-6 w-6 mr-3" />
                  Iniciar Actualización
                </Button>
              )}

              {updateStatus && (
                <div
                  className={`max-w-2xl mx-auto p-8 rounded-xl backdrop-blur-md border-2 ${
                    updateStatus === "loading"
                      ? "bg-blue-50/80 border-blue-200"
                      : updateStatus === "success"
                      ? "bg-green-50/80 border-green-200"
                      : "bg-red-50/80 border-red-200"
                  }`}
                >
                  {updateStatus === "loading" && (
                    <Spinner
                      size={64}
                      className="text-[#2E5C8A] mx-auto mb-4"
                    />
                  )}
                  {updateStatus === "success" && (
                    <Check className="h-16 w-16 text-green-600 mx-auto mb-4" />
                  )}
                  {updateStatus === "error" && (
                    <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
                  )}
                  <p
                    className={`text-lg font-semibold ${
                      updateStatus === "loading"
                        ? "text-blue-900"
                        : updateStatus === "success"
                        ? "text-green-900"
                        : "text-red-900"
                    }`}
                  >
                    {updateMessage}
                  </p>
                  {updateStatus === "success" && (
                    <Button
                      onClick={() => {
                        setUpdateStatus(null);
                        setCurrentStep(4);
                      }}
                      className="mt-6 bg-green-600 hover:bg-green-700 text-white"
                    >
                      Ver Resultados
                      <ChevronRight className="h-5 w-5 ml-2" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* PASO 4 */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-[#1a3d5c] flex items-center gap-3">
                    <Check className="h-7 w-7 text-green-600" />
                    Proyectos Validados en la Cartera Pública
                  </h2>
                  <p className="text-gray-600 mt-2">
                    Estos son los proyectos que se mostrarán en la cartera
                    pública
                  </p>
                </div>
                <Button
                  onClick={fetchData}
                  disabled={loading}
                  className="bg-[#2E5C8A] hover:bg-[#1e4a6f] text-white"
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                  />
                  Recargar
                </Button>
              </div>

              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <Spinner size={64} className="text-[#2E5C8A]" />
                </div>
              ) : validatedProjects.length === 0 ? (
                <Alert className="bg-yellow-50/80 backdrop-blur-md border-yellow-200">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <AlertTitle>Sin proyectos validados</AlertTitle>
                  <AlertDescription>
                    No hay proyectos validados después de la actualización.
                    Asegúrate de marcar proyectos como "TRUE" en la columna
                    VALIDAR del Google Sheet.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="bg-green-50/80 backdrop-blur-md border border-green-200 rounded-xl p-6">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="font-bold text-green-900 text-lg">
                          Actualización exitosa
                        </p>
                        <p className="text-green-700 text-sm">
                          {validatedProjects.length} proyectos validados se
                          mostrarán en la cartera pública
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {validatedProjects.map((project, index) => (
                      <SheetProjectCard
                        key={index}
                        project={project}
                        onClick={() => handleProjectClick(project)}
                        showValidationBadge={true}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Navegación entre pasos */}
          <div className="flex justify-between mt-8 pt-6 border-t border-white/50">
            <Button
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
              variant="outline"
              className="bg-white/60 backdrop-blur-md border-white/60 hover:bg-white/80"
            >
              <ChevronLeft className="h-5 w-5 mr-2" />
              Anterior
            </Button>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Paso {currentStep} de {steps.length}
              </p>
            </div>

            <Button
              onClick={() => setCurrentStep(Math.min(4, currentStep + 1))}
              disabled={currentStep === 4}
              className="bg-gradient-to-r from-[#2E5C8A] to-[#3B76B3] hover:from-[#1e4a6f] hover:to-[#2E5C8A] text-white"
            >
              Siguiente
              <ChevronRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        </div>
      </main>

      {/* MODAL DE DETALLES DEL PROYECTO */}
      {selectedProject && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent
            className="w-full max-w-md md:max-w-4xl rounded-3xl p-0 bg-white/70 backdrop-blur-xl border-2 border-white/60 shadow-2xl overflow-hidden"
            style={{ maxHeight: "90vh", overflowY: "auto" }}
          >
            {/* Header del Modal */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#1e3a5f] via-[#2E5C8A] to-[#3B76B3] px-8 py-8">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-white/10 rounded-full blur-3xl"></div>

              <div className="relative z-10 space-y-4">
                <div>
                  <DialogTitle className="text-2xl md:text-3xl font-bold text-white mb-3 leading-tight">
                    {selectedProject["Nombre Proyecto/Perfil Proyecto"] ||
                      selectedProject["Nombre Proyecto"] ||
                      selectedProject["Perfil Proyecto"] ||
                      "Sin nombre"}
                  </DialogTitle>

                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    {getStatusBadge(selectedProject["Estatus"] || "Sin estado")}
                    {getThematicBadge(
                      selectedProject["Temática"] || "Sin temática"
                    )}
                    {getValidationBadge(
                      String(selectedProject["VALIDAR"]).toLowerCase() ===
                        "true"
                    )}
                    {selectedProject["Institucion Convocatoria"] && (
                      <Badge className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-white/20 backdrop-blur-md text-white border border-white/30">
                        <span>
                          {selectedProject["Institucion Convocatoria"]}
                        </span>
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Info Cards en el Header */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-white/15 backdrop-blur-md rounded-xl p-3 border border-white/25">
                    <p className="text-xs text-blue-100 font-medium mb-1 uppercase tracking-wide">
                      Unidad Responsable
                    </p>
                    <p className="text-white font-semibold text-sm">
                      {selectedProject["Unidad Académica"] || "Sin información"}
                      {selectedProject["Unidad Académica ++"] &&
                        `, ${selectedProject["Unidad Académica ++"]}`}
                    </p>
                  </div>

                  <div className="bg-white/15 backdrop-blur-md rounded-xl p-3 border border-white/25">
                    <p className="text-xs text-blue-100 font-medium mb-1 uppercase tracking-wide">
                      Monto Solicitado
                    </p>
                    <p className="text-white font-bold text-lg">
                      $
                      {parseFloat(
                        selectedProject["Monto Proyecto MM"] || 0
                      ).toLocaleString("es-CL")}
                    </p>
                  </div>

                  <div className="bg-white/15 backdrop-blur-md rounded-xl p-3 border border-white/25">
                    <p className="text-xs text-blue-100 font-medium mb-1 uppercase tracking-wide">
                      Fecha de Registro
                    </p>
                    <p className="text-white font-semibold text-sm">
                      {formatDateFull(selectedProject["Fecha Postulación"])}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contenido del Modal */}
            <div className="p-8 space-y-6 bg-white/40">
              {/* Información del Proyecto */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-[#1a3d5c] flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#2E5C8A] rounded-lg flex items-center justify-center">
                    <ClipboardList className="h-5 w-5 text-white" />
                  </div>
                  Información del Proyecto
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Tipo de Apoyo */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-gray-200 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-[#2E5C8A] rounded-xl flex items-center justify-center flex-shrink-0">
                        <CircleDollarSign className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-600 font-medium mb-2 uppercase tracking-wide">
                          Tipo de Apoyo
                        </p>
                        <p className="text-sm font-bold text-[#1a3d5c]">
                          {selectedProject["Tipo Apoyo"] || "Sin información"}
                        </p>
                        {selectedProject["Detalle Apoyo"] && (
                          <p className="text-xs text-gray-700 mt-1">
                            {selectedProject["Detalle Apoyo"]}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Convocatoria */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-gray-200 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-[#2E5C8A] rounded-xl flex items-center justify-center flex-shrink-0">
                        <Calendar className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-600 font-medium mb-2 uppercase tracking-wide">
                          Convocatoria
                        </p>
                        <p className="text-sm font-bold text-[#1a3d5c]">
                          {selectedProject[
                            "Nombre Convocatoria a la que se postuló"
                          ] || "Sin información"}
                        </p>
                        {selectedProject["Tipo Convocatoria"] && (
                          <p className="text-xs text-gray-700 mt-1">
                            {selectedProject["Tipo Convocatoria"]}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Equipo del Proyecto */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-[#1a3d5c] flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#2E5C8A] rounded-lg flex items-center justify-center">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  Equipo del Proyecto
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Académicos */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 bg-[#2E5C8A] rounded-lg flex items-center justify-center">
                        <GraduationCap className="h-5 w-5 text-white" />
                      </div>
                      <h4 className="text-lg font-bold text-[#1a3d5c]">
                        Académicos
                      </h4>
                    </div>

                    <div className="space-y-3">
                      {selectedProject["Académic@/s-Líder"] && (
                        <div className="bg-gray-50 p-3 rounded-xl">
                          <p className="text-xs text-gray-600 font-medium mb-1">
                            Líder
                          </p>
                          <p className="text-sm font-semibold text-[#1a3d5c]">
                            {selectedProject["Académic@/s-Líder"]}
                          </p>
                        </div>
                      )}
                      {selectedProject["Académic@/s-Partner"] && (
                        <div className="bg-gray-50 p-3 rounded-xl">
                          <p className="text-xs text-gray-600 font-medium mb-1">
                            Partner
                          </p>
                          <p className="text-sm font-semibold text-[#1a3d5c]">
                            {selectedProject["Académic@/s-Partner"]}
                          </p>
                        </div>
                      )}
                      {!selectedProject["Académic@/s-Líder"] &&
                        !selectedProject["Académic@/s-Partner"] && (
                          <p className="text-sm text-gray-600 text-center py-4">
                            Sin académicos
                          </p>
                        )}
                    </div>
                  </div>

                  {/* Estudiantes */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 bg-[#2E5C8A] rounded-lg flex items-center justify-center">
                        <Users className="h-5 w-5 text-white" />
                      </div>
                      <h4 className="text-lg font-bold text-[#1a3d5c]">
                        Estudiantes
                      </h4>
                    </div>

                    {selectedProject["Estudiantes"] &&
                    selectedProject["Estudiantes"].trim().length > 0 ? (
                      <div className="bg-gray-50 p-3 rounded-xl">
                        <p className="text-sm text-[#1a3d5c]">
                          {selectedProject["Estudiantes"]}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600 text-center py-4">
                        Sin estudiantes
                      </p>
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
