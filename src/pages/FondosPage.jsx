// src/pages/FondosConcursablesPage.jsx

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  Search,
  Target,
  ClipboardList,
  Calendar,
  RotateCcw, // Icono para recargar
  XCircle,
  Info,
} from "lucide-react";

import { Textarea } from "@/components/ui/textarea.jsx";

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

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

import anidLogo from "../assets/tipos_convocatorias/anid_rojo_azul.png";
import corfoLogo from "../assets/tipos_convocatorias/corfo2024.png";
import goreLogo from "../assets/tipos_convocatorias/gore-valpo.jpg";
import internasPucvLogo from "../assets/tipos_convocatorias/internaspucv.svg";
import privadaLogo from "../assets/tipos_convocatorias/private.png";

const FONDO_LOGOS = {
  ANID: anidLogo,
  CORFO: corfoLogo,
  GORE: goreLogo,
  INTERNAS: internasPucvLogo,
  PRIVADA: privadaLogo,
};

const FONDO_URLS = {
  ANID: "https://anid.cl/",
  CORFO: "https://www.corfo.cl",
  GORE: "https://www.gobiernovalparaiso.cl/",
  INTERNAS: "https://www.pucv.cl/",
  PRIVADA: "",
};

const FONDOS_API_URL = import.meta.env.VITE_URL_FONDOS;
const SYNC_API_URL = `${FONDOS_API_URL}sync`; // Nueva URL para la sincronización

export default function FondosPage() {
  const [fondosData, setFondosData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorLocal, setErrorLocal] = useState(null);
  const { setError: setErrorGlobal } = useError();

  const [filterTipoFondo, setFilterTipoFondo] = useState("todos");
  const [filterTrl, setFilterTrl] = useState("todos");
  const [filterEstado, setFilterEstado] = useState("todos");
  const [searchTerm, setSearchTerm] = useState("");

  const getTipoFondoColor = useCallback((tipoFondoNombre) => {
    switch (tipoFondoNombre) {
      case "ANID":
        return "bg-red-500 text-white";
      case "CORFO":
        return "bg-orange-500 text-white";
      case "INTERNAS":
        return "bg-blue-500 text-white";
      case "GORE":
        return "bg-purple-500 text-white";
      case "PRIVADA":
        return "bg-gray-600 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  }, []);

  const renderTipoFondoLogo = useCallback((tipoFondoNombre) => {
    const logoSrc = FONDO_LOGOS[tipoFondoNombre];
    if (logoSrc) {
      return (
        <img
          src={logoSrc}
          alt={`${tipoFondoNombre} Logo`}
          className="h-5 w-5 object-contain rounded-full border border-gray-200"
        />
      );
    }
    return (
      <div className="h-5 w-5 flex items-center justify-center bg-gray-200 rounded-full text-gray-700 text-[0.7rem] font-bold flex-shrink-0">
        {tipoFondoNombre ? tipoFondoNombre.charAt(0) : "F"}
      </div>
    );
  }, []);

  const getTRLColor = (trl) => {
    if (trl === null || trl === "Sin información" || trl === "")
      return "bg-gray-500 text-white";
    return "bg-green-500 text-white";
  };

  const parseDateDDMMYYYY = (dateString) => {
    if (!dateString) return null;
    const parts = dateString.split("/").map(Number);
    if (parts.length === 3) {
      return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    return null;
  };

  const formatDate = useCallback((dateString) => {
    if (!dateString) return "Sin fecha";
    try {
      let date = parseDateDDMMYYYY(dateString);

      if (!date || isNaN(date.getTime())) {
        date = new Date(dateString);
      }

      if (isNaN(date.getTime())) return "Fecha Inválida";
      const options = { year: "numeric", month: "long", day: "numeric" };
      return date.toLocaleDateString("es-CL", options);
    } catch (e) {
      console.error("Error formatting date:", e);
      return "Fecha Inválida";
    }
  }, []);

  const isFondoVigente = useCallback((fechaCierreStr) => {
    if (!fechaCierreStr) return false;
    const fechaCierre = parseDateDDMMYYYY(fechaCierreStr);
    if (!fechaCierre || isNaN(fechaCierre.getTime())) return false;

    const hoy = new Date();
    fechaCierre.setHours(23, 59, 59, 999);

    return hoy <= fechaCierre;
  }, []);

  const getEstadoBadgeColor = useCallback((estadoVigencia) => {
    return estadoVigencia === "Vigente"
      ? "bg-green-500 text-white"
      : "bg-red-500 text-white";
  }, []);

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const fetchAllFondosData = async () => {
    setLoading(true);
    setErrorLocal(null);
    setErrorGlobal(null);

    try {
      // 1) DELETE
      const deleteResponse = await fetch(FONDOS_API_URL, { method: "DELETE" });

      if (!deleteResponse.ok) {
        throw new Error(
          `HTTP error al eliminar! status: ${deleteResponse.status}`
        );
      }

      // OJO: algunos backends no “cierran” hasta que consumes el body
      // (si no tiene body, esto cae al catch y no pasa nada)
      try {
        await deleteResponse.json();
      } catch {
        // ignore (por ejemplo 204 No Content)
      }

      // 2) Esperar a que realmente quede vacío (polling corto)
      //    Ajusta intentos/espera según tu backend.
      let cleared = false;
      for (let i = 0; i < 10; i++) {
        await wait(300); // 0.3s * 10 = 3s max

        const check = await fetch(FONDOS_API_URL, { method: "GET" });
        if (!check.ok) continue;

        const checkData = await check.json();
        const arr = Array.isArray(checkData?.data) ? checkData.data : [];
        if (arr.length === 0) {
          cleared = true;
          break;
        }
      }

      // Si tu backend no permite comprobar rápido, al menos esperas un poco:
      if (!cleared) {
        await wait(500);
      }

      // 3) SYNC (POST)
      const syncResponse = await fetch(SYNC_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!syncResponse.ok) {
        throw new Error(
          `HTTP error al sincronizar! status: ${syncResponse.status}`
        );
      }

      // igual: consumir body si existe
      try {
        await syncResponse.json();
      } catch {
        // ignore
      }

      // 4) GET actualizado
      const response = await fetch(FONDOS_API_URL);
      if (!response.ok) {
        throw new Error(
          `HTTP error al obtener fondos! status: ${response.status}`
        );
      }
      const data = await response.json();

      const filteredRawFondos = (data.data || []).filter(
        (fondo) => fondo.VALIDAR === true
      );

      const processedFondos = filteredRawFondos.map((fondo) => {
        const tipoNombre = fondo["Tipo de Fondo"] || "Desconocido";
        const idFondo = fondo._id?.$oid || fondo._id;

        const estadoVigenciaCalculado = isFondoVigente(fondo["Fecha Termino"])
          ? "Vigente"
          : "Finalizado";

        return {
          id: idFondo,
          nombre: fondo.Nombre,
          tipo_nombre: tipoNombre,
          trl: fondo.TRL,
          financiamiento: fondo["Financiamiento MM"],
          inicio: fondo["Fecha Inicio"],
          cierre: fondo["Fecha Termino"],
          objetivo: fondo.Objetivo,
          req: fondo.Requisitos,
          duracion: fondo.Duración,
          estado_vigencia: estadoVigenciaCalculado,
        };
      });

      setFondosData(processedFondos);
    } catch (err) {
      console.error("Error al gestionar fondos:", err);
      setErrorGlobal({
        type: "error",
        title: "Error al cargar/sincronizar los fondos.",
      });
      setErrorLocal(
        `No se pudieron cargar ni sincronizar los fondos: ${err.message}. Inténtelo de nuevo más tarde.`
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchAllFondosData();
  }, []);

  const filteredFondos = useMemo(() => {
    return fondosData.filter((fondo) => {
      const matchesTipoFondo =
        filterTipoFondo === "todos" || fondo.tipo_nombre === filterTipoFondo;
      const matchesTrl =
        filterTrl === "todos" ||
        (fondo.trl !== null && String(fondo.trl) === filterTrl) ||
        (filterTrl === "Sin información" && fondo.trl === null);
      const matchesEstado =
        filterEstado === "todos" || fondo.estado_vigencia === filterEstado;
      const matchesSearch =
        searchTerm === "" ||
        fondo.nombre.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesTipoFondo && matchesTrl && matchesEstado && matchesSearch;
    });
  }, [fondosData, filterTipoFondo, filterTrl, filterEstado, searchTerm]);

  const uniqueTiposFondo = useMemo(() => {
    const tiposDesdeData = fondosData.map((f) => f.tipo_nombre);
    const tiposFijos = ["ANID", "CORFO", "GORE", "INTERNAS", "PRIVADA"];
    return [...new Set([...tiposDesdeData, ...tiposFijos])]
      .filter(Boolean)
      .sort();
  }, [fondosData]);

  const uniqueTRLs = [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "Sin información",
  ];
  const uniqueEstados = ["Vigente", "Finalizado"];

  const resetFilters = () => {
    setFilterTipoFondo("todos");
    setFilterTrl("todos");
    setFilterEstado("todos");
    setSearchTerm("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-200 via-sky-300 to-blue-200 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">
              Fondos Concursables
            </h2>
            <p className="text-gray-700 mt-2">
              Explora y gestiona todas las convocatorias disponibles para
              financiar tus proyectos
            </p>
          </div>

          <Button
            className="bg-[#2E5C8A] text-white backdrop-blur-xl rounded-2xl px-4 py-2 shadow-xl border border-white/40 hover:bg-[#3B76B3] hover:shadow-2xl transition-all duration-300"
            onClick={fetchAllFondosData}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Recargar Tabla
          </Button>
        </div>

        {/* Filtros (glass como HomePage) */}
        <div className="bg-white/30 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/60 hover:bg-white/40 hover:shadow-2xl transition-all duration-300 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            <div>
              <label
                htmlFor="filterTipoFondo"
                className="block text-sm font-medium text-gray-800 mb-2"
              >
                TIPO DE FONDO:
              </label>
              <Select
                value={filterTipoFondo}
                onValueChange={setFilterTipoFondo}
              >
                <SelectTrigger
                  id="filterTipoFondo"
                  className="w-full bg-white/50 backdrop-blur-md border-white/60 hover:bg-white/70 transition-all"
                >
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {uniqueTiposFondo.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label
                htmlFor="filterTrl"
                className="block text-sm font-medium text-gray-800 mb-2"
              >
                TRL:
              </label>
              <Select value={filterTrl} onValueChange={setFilterTrl}>
                <SelectTrigger
                  id="filterTrl"
                  className="w-full bg-white/50 backdrop-blur-md border-white/60 hover:bg-white/70 transition-all"
                >
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {uniqueTRLs.map((trl) => (
                    <SelectItem key={trl} value={trl}>
                      {trl}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label
                htmlFor="filterEstado"
                className="block text-sm font-medium text-gray-800 mb-2"
              >
                ESTADO:
              </label>
              <Select value={filterEstado} onValueChange={setFilterEstado}>
                <SelectTrigger
                  id="filterEstado"
                  className="w-full bg-white/50 backdrop-blur-md border-white/60 hover:bg-white/70 transition-all"
                >
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {uniqueEstados.map((estado) => (
                    <SelectItem key={estado} value={estado}>
                      {estado}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-full sm:col-span-2 md:col-span-1 lg:col-span-2 xl:col-span-1">
              <label
                htmlFor="searchTerm"
                className="block text-sm font-medium text-gray-800 mb-2"
              >
                BUSCAR:
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                <Input
                  id="searchTerm"
                  type="text"
                  placeholder="Buscar por nombre"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 bg-white/50 backdrop-blur-md border-white/60 hover:bg-white/70 transition-all"
                />
              </div>
            </div>

            <div className="col-span-full sm:col-span-2 md:col-span-3 lg:col-span-1 flex items-end justify-end">
              <Button
                onClick={resetFilters}
                className="bg-[#2E5C8A] text-white backdrop-blur-xl rounded-2xl px-4 py-2 shadow-xl border border-white/40 hover:bg-[#3B76B3] hover:shadow-2xl transition-all duration-300"
              >
                <RotateCcw className="h-4 w-4" />
                Reiniciar Filtros
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white/30 backdrop-blur-xl rounded-2xl p-8 shadow-xl border border-white/60 hover:bg-white/40 hover:shadow-2xl transition-all duration-300">
            <div className="flex flex-col items-center justify-center">
              <Spinner size={48} className="text-[#2E5C8A] mb-4" />
              <p className="text-lg text-gray-800">
                Cargando fondos... Por favor, espere.
              </p>
            </div>
          </div>
        ) : errorLocal ? (
          <Alert
            variant="destructive"
            className="bg-white/30 backdrop-blur-xl rounded-2xl shadow-xl border border-white/60 hover:bg-white/40 hover:shadow-2xl transition-all duration-300"
          >
            <XCircle className="h-5 w-5 mr-4" />
            <AlertTitle>Error al cargar fondos</AlertTitle>
            <AlertDescription>{errorLocal}</AlertDescription>
          </Alert>
        ) : filteredFondos.length === 0 ? (
          <Alert
            variant="default"
            className="bg-white/30 backdrop-blur-xl rounded-2xl shadow-xl border border-white/60 hover:bg-white/40 hover:shadow-2xl transition-all duration-300"
          >
            <Info className="h-5 w-5 mr-4" />
            <AlertTitle>No hay fondos</AlertTitle>
            <AlertDescription>
              No se encontraron fondos con los filtros o búsqueda actuales.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Header tabla (glass) */}
            <div className="hidden md:block bg-white/30 backdrop-blur-xl rounded-t-2xl shadow-xl border border-white/60">
              <div className="grid grid-cols-[1fr_0.8fr_0.5fr_0.8fr_0.8fr_0.8fr_auto] gap-4 p-4 bg-white/20 border-b border-white/40 font-semibold text-gray-800 text-sm items-center">
                <div className="text-left">Nombre del Fondo</div>
                <div className="text-center">Tipo de Fondo</div>
                <div className="text-center">TRL</div>
                <div className="text-center">Financiamiento</div>
                <div className="text-center">Duración</div>
                <div className="text-center">Estado</div>
                <div className="text-center"></div>
              </div>
            </div>

            {/* Tabla/Accordion (glass) */}
            <div className="bg-white/30 backdrop-blur-xl rounded-b-2xl shadow-xl border border-white/60 overflow-hidden hover:bg-white/40 hover:shadow-2xl transition-all duration-300">
              <Accordion type="single" collapsible className="w-full">
                {filteredFondos.map((fondo) => (
                  <AccordionItem
                    value={`item-${fondo.id}`}
                    key={fondo.id}
                    className="border-b border-white/40"
                  >
                    <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr_auto] items-center py-2 px-6 gap-4 group hover:bg-white/20 transition-all duration-300">
                      <AccordionTrigger className="flex items-center gap-2 text-left">
                        {renderTipoFondoLogo(fondo.tipo_nombre)}
                        <span className="font-medium text-gray-900 line-clamp-1">
                          {fondo.nombre}
                        </span>
                      </AccordionTrigger>

                      <div className="text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${getTipoFondoColor(
                            fondo.tipo_nombre
                          )}`}
                        >
                          {fondo.tipo_nombre}
                        </span>
                        {FONDO_URLS[fondo.tipo_nombre] && (
                          <a
                            href={FONDO_URLS[fondo.tipo_nombre]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-700 font-semibold mt-2 hover:underline text-xs line-clamp-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {FONDO_URLS[fondo.tipo_nombre]}
                          </a>
                        )}
                      </div>

                      <div className="text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${getTRLColor(
                            fondo.trl === null
                              ? "Sin información"
                              : String(fondo.trl)
                          )}`}
                        >
                          {fondo.trl === null
                            ? "Sin información"
                            : `TRL ${fondo.trl}`}
                        </span>
                      </div>

                      <div className="text-center text-gray-800 font-medium line-clamp-1">
                        {fondo.financiamiento + " millones" ||
                          "Sin información"}
                      </div>

                      <div className="text-center text-gray-700 line-clamp-1">
                        {fondo.duracion || "Sin información"}
                      </div>

                      <div className="text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${getEstadoBadgeColor(
                            fondo.estado_vigencia
                          )}`}
                        >
                          {fondo.estado_vigencia}
                        </span>
                      </div>

                      <div className="flex justify-center items-center" />
                    </div>

                    <AccordionContent asChild>
                      <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr_auto]">
                        <div className="col-span-7 bg-white/20 p-6 border-t border-white/40">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
                                <Target className="w-4 h-4 mr-2 text-gray-600" />
                                Objetivo:
                              </h4>
                              <p className="text-sm text-gray-700">
                                {fondo.objetivo ||
                                  "No se ha especificado el objetivo para este fondo."}
                              </p>
                            </div>

                            <div>
                              <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
                                <ClipboardList className="w-4 h-4 mr-2 text-gray-600" />
                                Requisitos:
                              </h4>
                              {fondo.req && fondo.req !== "" ? (
                                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                  {fondo.req
                                    .split(/[\r\n]/)
                                    .map((req, i) =>
                                      req.trim() ? (
                                        <li key={i}>{req.trim()}</li>
                                      ) : null
                                    )}
                                </ul>
                              ) : (
                                <p className="text-sm text-gray-700">
                                  No hay requisitos detallados disponibles.
                                </p>
                              )}
                            </div>

                            <div className="md:col-span-2">
                              <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
                                <Calendar className="w-4 h-4 mr-2 text-gray-600" />
                                Fechas Importantes:
                              </h4>
                              <p className="text-sm text-gray-700">
                                Inicio: {formatDate(fondo.inicio)}
                              </p>
                              <p className="text-sm text-gray-700">
                                Cierre: {formatDate(fondo.cierre)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
