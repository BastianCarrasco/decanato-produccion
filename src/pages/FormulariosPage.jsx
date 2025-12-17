import { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  FileText,
  Filter,
  School,
  User,
  XCircle,
  List,
  Info,
} from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useError } from "@/contexts/ErrorContext";

export default function FormulariosPage() {
  const VITE_URL_PERFIL_PROYECTOS = import.meta.env.VITE_URL_PERFIL_PROYECTOS;
  const VITE_URL_PREGUNTAS_PERFIL = import.meta.env.VITE_URL_PREGUNTAS_PERFIL;

  const [respuestasData, setRespuestasData] = useState([]);

  const [loading, setLoading] = useState(true);
  const [errorLocal, setErrorLocal] = useState(null);
  const { setError: setErrorGlobal } = useError();

  const [filtroAcademico, setFiltroAcademico] = useState("todos");
  const [filtroEscuela, setFiltroEscuela] = useState("todos");
  const [filtroFecha, setFiltroFecha] = useState("");
  const [respuestaSeleccionadaId, setRespuestaSeleccionadaId] = useState(null);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return "Sin fecha";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Fecha Inválida";
      const options = { year: "numeric", month: "long", day: "numeric" };
      return date.toLocaleDateString("es-CL", options);
    } catch (e) {
      console.error("Error formatting date:", e);
      return "Fecha Inválida";
    }
  }, []);

  const isToday = useCallback((dateString) => {
    if (!dateString) return false;
    try {
      const date = new Date(dateString);
      const today = new Date();
      return (
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
      );
    } catch {
      return false;
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setErrorLocal(null);
    setErrorGlobal(null);

    try {
      if (!VITE_URL_PERFIL_PROYECTOS) {
        throw new Error(
          "Falta VITE_URL_PERFIL_PROYECTOS en las variables de entorno."
        );
      }
      if (!VITE_URL_PREGUNTAS_PERFIL) {
        throw new Error(
          "Falta VITE_URL_PREGUNTAS_PERFIL en las variables de entorno."
        );
      }

      const [proyectosRes, preguntasRes] = await Promise.all([
        fetch(VITE_URL_PERFIL_PROYECTOS, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }),
        fetch(VITE_URL_PREGUNTAS_PERFIL, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }),
      ]);

      if (!proyectosRes.ok) {
        throw new Error(`Error HTTP proyectos: ${proyectosRes.status}`);
      }
      if (!preguntasRes.ok) {
        throw new Error(`Error HTTP preguntas: ${preguntasRes.status}`);
      }

      const items = await proyectosRes.json();
      const preguntas = await preguntasRes.json();

      if (!Array.isArray(items)) {
        throw new Error("La API de proyectos no devolvió un array.");
      }
      if (!Array.isArray(preguntas)) {
        throw new Error("La API de preguntas no devolvió un array.");
      }

      // Map: numero -> texto pregunta
      const preguntasMap = preguntas.reduce((acc, p) => {
        if (typeof p?.numero === "number") {
          acc[p.numero] = p.pregunta || `Pregunta ${p.numero}`;
        }
        return acc;
      }, {});

      const processedRespuestas = items.map((item) => {
        const respuestasArray = Array.isArray(item.respuestas)
          ? item.respuestas
          : [];

        return {
          id: item._id,
          nombre: item.investigador || "Desconocido",
          escuela: item.escuela || "Desconocida",
          fecha: item.fecha_creacion || null,
          titulo: item.titulo,
          respuestas: respuestasArray
            .map((respuestaTexto, index) => {
              const numero = index + 1;

              return {
                numero,
                // AQUÍ se conecta por numero con VITE_URL_PREGUNTAS_PERFIL
                texto: preguntasMap[numero] ?? `Pregunta ${numero}`,
                respuesta: respuestaTexto || "Sin respuesta",
              };
            })
            .sort((a, b) => a.numero - b.numero),
        };
      });

      setRespuestasData(processedRespuestas);
      setRespuestaSeleccionadaId(
        processedRespuestas.length > 0 ? processedRespuestas[0].id : null
      );
    } catch (err) {
      console.error("Error fetching data for FormulariosPage:", err);

      const message =
        err instanceof Error
          ? err.message
          : "Error desconocido al cargar datos";

      setErrorLocal(message);
      setErrorGlobal({
        type: "error",
        title: "Error al cargar los formularios.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uniqueAcademicos = [...new Set(respuestasData.map((r) => r.nombre))]
    .filter(Boolean)
    .sort();

  const uniqueEscuelas = [...new Set(respuestasData.map((r) => r.escuela))]
    .filter(Boolean)
    .sort();

  const respuestasFiltradas = respuestasData.filter((r) => {
    const coincideAcademico =
      filtroAcademico === "todos" || r.nombre === filtroAcademico;
    const coincideEscuela =
      filtroEscuela === "todos" || r.escuela === filtroEscuela;
    const coincideFecha =
      !filtroFecha || (r.fecha && r.fecha.startsWith(filtroFecha));

    return coincideAcademico && coincideEscuela && coincideFecha;
  });

  const respuestaSeleccionada =
    respuestasFiltradas.find((r) => r.id === respuestaSeleccionadaId) ||
    respuestasFiltradas[0] ||
    null;

  useEffect(() => {
    if (
      respuestaSeleccionada &&
      respuestaSeleccionada.id !== respuestaSeleccionadaId
    ) {
      setRespuestaSeleccionadaId(respuestaSeleccionada.id);
    } else if (!respuestaSeleccionada && respuestaSeleccionadaId !== null) {
      setRespuestaSeleccionadaId(null);
    }
  }, [respuestaSeleccionada, respuestaSeleccionadaId]);

  // OPCIÓN A: 1/3 izquierda, 2/3 derecha (recomendada)
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Formularios</h2>
          <p className="text-gray-600 mt-2">
            Revisa las respuestas de los formularios
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-5 w-5 text-gray-600" />
                <span className="text-gray-700 font-medium">Filtrar por:</span>
              </div>

              <div className="relative">
                <Select
                  value={filtroAcademico}
                  onValueChange={setFiltroAcademico}
                >
                  <SelectTrigger className="px-2 w-50 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white min-w-48">
                    <SelectValue placeholder="Todos los académicos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los académicos</SelectItem>
                    {uniqueAcademicos.map((nombre) => (
                      <SelectItem key={nombre} value={nombre}>
                        {nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="relative">
                <Select value={filtroEscuela} onValueChange={setFiltroEscuela}>
                  <SelectTrigger className="px-2 w-72 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white min-w-48">
                    <SelectValue placeholder="Todas las escuelas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas las escuelas</SelectItem>
                    {uniqueEscuelas.map((escuela) => (
                      <SelectItem key={escuela} value={escuela}>
                        {escuela}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="relative">
                <Input
                  type="date"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white min-w-48"
                  value={filtroFecha}
                  onChange={(e) => setFiltroFecha(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                onClick={() => {
                  setFiltroAcademico("todos");
                  setFiltroEscuela("todos");
                  setFiltroFecha("");
                }}
              >
                Reiniciar filtros
              </Button>
            </div>
          </div>
        </div>

        {/* CAMBIO: de 2 columnas iguales a 3 columnas con spans */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* IZQUIERDA: 1/3 */}
          <div className="bg-white rounded-lg shadow-lg lg:col-span-1">
            <div className="p-6 border-b border-gray-200 flex items-center space-x-3">
              <List className="h-6 w-6 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Lista de respuestas
              </h3>
            </div>

            <div className="divide-y divide-gray-200">
              {loading ? (
                <div className="flex justify-center items-center h-48 py-8">
                  <Spinner size={32} className="text-[#2E5C8A]" />
                </div>
              ) : errorLocal ? (
                <Alert
                  variant="destructive"
                  className="bg-red-50 text-red-700 mx-4 my-4"
                >
                  <XCircle className="h-5 w-5 mr-4" />
                  <AlertTitle>Error al cargar respuestas</AlertTitle>
                  <AlertDescription>{errorLocal}</AlertDescription>
                </Alert>
              ) : respuestasFiltradas.length === 0 ? (
                <Alert
                  variant="default"
                  className="bg-blue-50 text-blue-700 mx-4 my-4"
                >
                  <Info className="h-5 w-5 mr-4" />
                  <AlertTitle>No hay respuestas</AlertTitle>
                  <AlertDescription>
                    No se encontraron respuestas con los filtros actuales.
                  </AlertDescription>
                </Alert>
              ) : (
                respuestasFiltradas.map((respuesta) => (
                  <div
                    key={respuesta.id}
                    onClick={() => setRespuestaSeleccionadaId(respuesta.id)}
                    className={`p-6 cursor-pointer transition-colors ${
                      respuestaSeleccionadaId === respuesta.id
                        ? "bg-blue-50 border-l-4 border-blue-500"
                        : "hover:bg-gray-50 border-l-4 border-transparent"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="text-lg font-semibold text-gray-900">
                            {respuesta.nombre}
                          </h4>
                          {isToday(respuesta.fecha) && (
                            <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                              Hoy
                            </span>
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <School className="h-4 w-4" />
                            <span>Escuela: {respuesta.escuela}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(respuesta.fecha)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* DERECHA: 2/3 */}
          <div className="bg-white rounded-lg shadow-lg lg:col-span-2">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <User className="h-6 w-6 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Detalles de la Respuesta
                </h3>
              </div>
            </div>

            {respuestaSeleccionada && (
              <div className="p-6">
                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <User className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-600">
                          Investigador:
                        </span>
                      </div>
                      <p className="font-semibold text-gray-900">
                        {respuestaSeleccionada.nombre}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <School className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-600">
                          Escuela:
                        </span>
                      </div>
                      <p className="font-semibold text-gray-900">
                        {respuestaSeleccionada.escuela}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-600">
                          Fecha:
                        </span>
                      </div>
                      <p className="font-semibold text-gray-900">
                        {formatDate(respuestaSeleccionada.fecha)}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    <FileText className="h-5 w-5 text-gray-600" />
                    <h4 className="text-lg font-semibold text-gray-900">
                      Respuestas del Cuestionario
                    </h4>
                  </div>

                  <div className="space-y-6">
                    {respuestaSeleccionada.respuestas.map((itemRespuesta) => (
                      <div
                        key={itemRespuesta.numero}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="mb-3">
                          <h5 className="font-semibold text-gray-900 mb-2">
                            Pregunta {itemRespuesta.numero}
                          </h5>
                          <p className="text-gray-700 italic">
                            {itemRespuesta.texto}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-gray-500 italic">
                            {itemRespuesta.respuesta || "Sin respuesta"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
