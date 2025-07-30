import { useState, useEffect, useCallback, useRef } from "react";
import {
  BarChart3,
  Building2,
  DollarSign,
  FileText,
  GraduationCap,
  Users,
  University,
  ChevronDown, // Importar ChevronDown para el icono de expandir/colapsar
  ChevronUp, // Importar ChevronUp para el icono de expandir/colapsar
  ArrowDownToLine,
  ArrowUpToLine,
} from "lucide-react";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import {
  PieChart as RechartsPieChart,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Pie,
  Text,
} from "recharts";

import { renderInstitucionLogo } from "./components/ProjectCard.jsx";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Button } from "@/components/ui/button";

import { useError } from "@/contexts/ErrorContext";

import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { XCircle, Info } from "lucide-react";

import funcionesService from "../api/funciones.js";
import estadisticasService from "../api/estadisticas.js";
import academicosService from "../api/academicos.js";
import unidadesAcademicasService from "../api/unidadesacademicas.js";

export default function EstadisticasPage() {
  const [proyectosData, setProyectosData] = useState([]); // getDataInterseccionProyectos
  const [profesoresPorUnidadData, setProfesoresPorUnidadData] = useState([]); // estadisticasService.getAcademicosPorUnidad
  const [proyectosPorProfesorData, setProyectosPorProfesorData] = useState([]); // estadisticasService.getProyectosPorProfesor
  const [academicosData, setAcademicosData] = useState([]); // academicosService.getAllAcademicos
  const [unidadesData, setUnidadesData] = useState([]); // unidadesAcademicasService.getAllUnidadesAcademicas

  const [academicosMap, setAcademicosMap] = useState({});
  const [unidadesMap, setUnidadesMap] = useState({});

  const [indicadoresPrincipales, setIndicadoresPrincipales] = useState({
    proyectosEnCartera: 0,
    montoFormulado: 0, // En número, se formatea en la función formatMM
    escuelasFIN: 0,
    academicosInvolucrados: 0,
  });

  const [tematicasDestacadas, setTematicasDestacadas] = useState([]);
  const [instrumentosPostulados, setInstrumentosPostulados] = useState([]);

  const [loading, setLoading] = useState(true);
  const [errorLocal, setErrorLocal] = useState(null);
  const { setError: setErrorGlobal } = useError();

  const estadisticasContentRef = useRef(null); // Ref para todo el contenido principal que queremos exportar
  const [loadingExportPDF, setLoadingExportPDF] = useState(false);

  // --- Estados para los filtros ---
  const [selectedEscuela, setSelectedEscuela] = useState("Todas las Escuelas");
  const [selectedTematica, setSelectedTematica] = useState(
    "Todas las Temáticas"
  );
  const [selectedInstitucion, setSelectedInstitucion] = useState(
    "Todas las Instituciones"
  );

  const [selectedEstatus, setSelectedEstatus] = useState("Todos los Estatus");

  // Opciones para los selects de filtro (calculadas dinámicamente)
  const opcionesEscuela = [
    ...new Set(profesoresPorUnidadData.map((item) => item.UnidadAcademica)),
  ]
    .filter(Boolean)
    .sort();
  opcionesEscuela.unshift("Todas las Escuelas");

  const opcionesTematica = [...new Set(proyectosData.map((p) => p.tematica))]
    .filter(Boolean)
    .sort();
  opcionesTematica.unshift("Todas las Temáticas");
  // Asumiendo que 'institucion' en proyectosData es la cadena de texto del nombre de la institución
  const opcionesInstitucion = [
    ...new Set(proyectosData.map((p) => p.institucion)),
  ]
    .filter(Boolean)
    .sort();
  opcionesInstitucion.unshift("Todas las Instituciones");

  const opcionesEstatus = [...new Set(proyectosData.map((p) => p.estatus))]
    .filter(Boolean)
    .sort();
  opcionesEstatus.unshift("Todos los Estatus");

  // --- Estados para los datos filtrados de los gráficos ---
  const [filteredProfesoresPorUnidad, setFilteredProfesoresPorUnidad] =
    useState([]);
  const [filteredProyectosPorProfesor, setFilteredProyectosPorProfesor] =
    useState([]);
  const [filteredProyectosPorTematica, setFilteredProyectosPorTematica] =
    useState([]);
  const [filteredProyectosPorInstitucion, setFilteredProyectosPorInstitucion] =
    useState([]);
  const [filteredProyectosPorUnidad, setFilteredProyectosPorUnidad] = useState(
    []
  );

  // Paleta de azules (mantener consistente para los pie charts)
  const bluePalette = [
    "#2E5C8A", // Azul principal
    "#5D95C8", // Azul medio
    "#7CA3CB", // Azul claro
    "#3B82F6", // Azul acento
    "#1E3A5C", // Azul oscuro
    "#0F2A4A", // Más oscuro
    "#4A7A9F", // Intermedio
  ];

  const groupAndCount = (data, key) => {
    const counts = {};
    data.forEach((item) => {
      // Usar el nombre mapeado si existe, o la clave directa
      const keyValue = item[`${key}_nombre`] || item[key];
      if (keyValue) {
        // Asegura que el valor no sea nulo o vacío
        counts[keyValue] = (counts[keyValue] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  };

  // Helper para formatear montos a MM$
  const formatMM = useCallback((monto) => {
    if (monto === null || monto === undefined || isNaN(monto)) return "0 MM$";
    const numericMonto = parseFloat(monto); // Asegura que el monto sea un número antes de dividir
    if (isNaN(numericMonto)) return "0 MM$";
    return `${(numericMonto / 1000000).toLocaleString("es-CL", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    })} MM$`;
  }, []);

  // Componente de etiqueta personalizada para PieChart
  const renderCustomizedLabel = useCallback(
    ({ cx, cy, midAngle, outerRadius, percent, index, name, value }) => {
      const RADIAN = Math.PI / 180;
      // Posición de la línea de la etiqueta
      const radius = outerRadius * 1.0; // Distancia desde el centro, ajustada
      const x = cx + radius * Math.cos(-midAngle * RADIAN);
      const y = cy + radius * Math.sin(-midAngle * RADIAN);

      // Posición del texto de la etiqueta
      const textX = cx + outerRadius * 1.1 * Math.cos(-midAngle * RADIAN);
      const textY = cy + outerRadius * 1.1 * Math.sin(-midAngle * RADIAN);
      const textAnchor = textX > cx ? "start" : "end";

      // Divide el nombre si es largo
      const words = name.split(" ");
      let line1 = "";
      let line2 = "";
      // Intenta dividir en dos líneas si es más de una palabra
      if (words.length > 1) {
        const mid = Math.ceil(words.length / 2);
        line1 = words.slice(0, mid).join(" ");
        line2 = words.slice(mid).join(" ");
      } else {
        line1 = name;
      }

      // Calcula el ángulo de la línea para evitar superposiciones con otras líneas
      const sin = Math.sin(-RADIAN * midAngle);
      const cos = Math.cos(-RADIAN * midAngle);

      const sx = cx + (outerRadius + 10) * cos;
      const sy = cy + (outerRadius + 10) * sin;
      const mx = cx + (outerRadius + 20) * cos;
      const my = cy + (outerRadius + 20) * sin;
      const ex = mx + (cos >= 0 ? 1 : -1) * 22; // Longitud horizontal de la línea
      const ey = my;

      const dropShadow =
        "drop-shadow(0px 0px 1px rgba(0, 0, 0, 0.5)) drop-shadow(0px 0px 1px rgba(0, 0, 0, 0.5))";

      return (
        <g>
          {/* Línea que conecta el segmento con la etiqueta */}
          <path
            d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
            stroke={"#888"}
            fill="none"
          />
          {/* Círculo en el punto de la línea */}
          <circle cx={ex} cy={ey} r={2} fill={"#888"} stroke="none" />
          {/* Texto de la etiqueta */}
          <Text
            x={ex + (cos >= 0 ? 1 : -1) * 6}
            y={ey - (line2 ? 6 : 0)} // Ajusta la posición vertical si hay 2 líneas
            textAnchor={textAnchor}
            dominantBaseline="central"
            fontSize={12}
            fill="#333"
            fontWeight="bold"
            //style={{ filter: dropShadow }} // Opcional: añade sombra para mejorar contraste
          >
            {line1}
          </Text>
          {line2 && (
            <Text
              x={ex + (cos >= 0 ? 1 : -1) * 6}
              y={ey + 6} // Posición de la segunda línea
              textAnchor={textAnchor}
              dominantBaseline="central"
              fontSize={12}
              fill="#333"
              //style={{ filter: dropShadow }} // Opcional: añade sombra para mejorar contraste
            >
              {line2}
            </Text>
          )}
          <Text
            x={ex + (cos >= 0 ? 1 : -1) * 6}
            y={ey + (line2 ? 18 : 6)} // Ajusta la posición del valor
            textAnchor={textAnchor}
            dominantBaseline="central"
            fontSize={12}
            fill="#666"
            fontWeight="bold"
            //style={{ filter: dropShadow }} // Opcional: añade sombra para mejorar contraste
          >
            {`${value}`}
          </Text>
        </g>
      );
    },
    []
  );

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload; // Accede a los datos del elemento sobre el que está el cursor
      const thematicName = data.name; // El nombre de la temática (ej. "Minería")
      const projectCount = data.value; // El conteo de proyectos (ej. 2)

      return (
        <div className="custom-tooltip bg-white p-3 border border-gray-200 rounded shadow-md">
          <p className="label font-semibold text-gray-900">{`${thematicName}`}</p>
          <p className="intro text-blue-600">{`Cantidad: ${projectCount}`}</p>
          {/* Si quieres el monto formulado o cualquier otro dato relacionado, lo puedes añadir aquí */}
          {/* <p className="desc text-gray-700">Monto: {formatMM(data.monto)}</p> */}
        </div>
      );
    }

    return null;
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    setErrorLocal(null);
    setErrorGlobal(null);
    try {
      const [
        proyectosRes,
        profesoresPorUnidadRes,
        proyectosPorProfesorRes,
        unidadesRes, // unidadesAcademicasService.getAllUnidadesAcademicas()
      ] = await Promise.all([
        funcionesService.getDataInterseccionProyectos(),
        estadisticasService.getAcademicosPorUnidad(),
        estadisticasService.getProyectosPorProfesor(),
        unidadesAcademicasService.getAllUnidadesAcademicas(),
      ]);

      // Mapear unidades académicas (id_unidad -> objeto unidad)
      const newUnidadesMap = unidadesRes.reduce((map, unidad) => {
        map[unidad.id_unidad] = unidad;
        return map;
      }, {});
      setUnidadesMap(newUnidadesMap);
      setUnidadesData(unidadesRes); // Guarda los datos de unidades completos

      // Los proyectos ahora se guardan crudos. Si necesitamos nombre_unidad_academica para `groupAndCount`,
      // lo haremos en `useEffect` de filtros, o cambiaremos la `dataKey` en el gráfico si `p.unidad` es suficiente.
      // O simplemente aceptamos que el `nombre_unidad_academica` puede ser 'Desconocida' si no hay match.
      setProyectosData(proyectosRes); // Guardar proyectos crudos sin procesamiento adicional para nombre de líder/unidad del líder

      // Aquí es donde `allProyectosPorProfesor` obtendrá sus datos directamente
      setProyectosPorProfesorData(proyectosPorProfesorRes);
      // Aquí `allProfesoresPorUnidad` obtendrá sus datos directamente
      setProfesoresPorUnidadData(profesoresPorUnidadRes);

      // No hay `academicosData` directo de esta API, así que no lo guardamos.
      // La cantidad de académicos involucrados se derivará de `proyectosPorProfesorRes`.
      setAcademicosData([]); // O mantener vacío si no tenemos un source para all academicos
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setErrorGlobal({
        type: "error", // Forzar a tipo error si falló
        title: "Error al cargar los datos del dashboard.",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = useCallback(() => {
    setSelectedEscuela("Todas las Escuelas");
    setSelectedTematica("Todas las Temáticas");
    setSelectedInstitucion("Todas las Instituciones");
    setSelectedEstatus("Todos los Estatus");
  }, []);

  // useEffect para llamar a fetchDashboardData al montar
  useEffect(() => {
    fetchDashboardData();
    // DEBUG: Datos iniciales después del fetch
    console.log(
      "DEBUG: Datos iniciales - proyectosData (total):",
      proyectosData.length,
      proyectosData
    );
    console.log(
      "DEBUG: Datos iniciales - profesoresPorUnidadData (total):",
      profesoresPorUnidadData.length,
      profesoresPorUnidadData
    );
    console.log(
      "DEBUG: Datos iniciales - proyectosPorProfesorData (total):",
      proyectosPorProfesorData.length,
      proyectosPorProfesorData
    );
  }, []); // El array vacío asegura que se ejecute una sola vez al montar

  // --- Lógica de filtrado ---
  useEffect(() => {
    // DEBUG: Datos en el inicio del useEffect de filtros
    console.log("DEBUG: --- useEffect de Filtros INICIO ---");
    console.log("DEBUG: selectedEscuela:", selectedEscuela);
    console.log(
      "DEBUG: currentProyectos ANTES de filtro de escuela:",
      proyectosData.length,
      proyectosData
    );
    console.log(
      "DEBUG: currentProfesoresPorUnidad ANTES de filtro de escuela:",
      profesoresPorUnidadData.length,
      profesoresPorUnidadData
    );
    console.log(
      "DEBUG: currentProyectosPorProfesor ANTES de filtro de escuela:",
      proyectosPorProfesorData.length,
      proyectosPorProfesorData
    );
    // 1. Datos base para filtrar: Proyectos del estado
    let currentProyectos = proyectosData;
    let currentProfesoresPorUnidad = profesoresPorUnidadData;
    let currentProyectosPorProfesor = proyectosPorProfesorData;

    // 2. Aplicar filtros SELECT (escuela, temática, institución) a `currentProyectos`

    // Filtro por escuela: Este filtro afecta a 3 gráficos
    if (selectedEscuela !== "Todas las Escuelas") {
      // Filtrar currentProyectos por la unidad del proyecto (p.unidad) si es la fuente más fiable para el filtro de escuela
      currentProyectos = proyectosData.filter(
        (p) => p.unidad === selectedEscuela
      );

      currentProfesoresPorUnidad = profesoresPorUnidadData.filter(
        (item) => item.UnidadAcademica === selectedEscuela
      );

      currentProyectosPorProfesor = proyectosPorProfesorData.filter(
        (p) => p.UnidadAcademica === selectedEscuela
      );
    } else {
      // Si no hay filtro de escuela, usar todos los datos originales
      currentProyectos = proyectosData;
      currentProfesoresPorUnidad = profesoresPorUnidadData;
      currentProyectosPorProfesor = proyectosPorProfesorData;
    }

    console.log(
      "DEBUG: currentProyectos DESPUÉS de filtro de escuela:",
      currentProyectos.length,
      currentProyectos
    );
    console.log(
      "DEBUG: currentProfesoresPorUnidad DESPUÉS de filtro de escuela:",
      currentProfesoresPorUnidad.length,
      currentProfesoresPorUnidad
    );
    console.log(
      "DEBUG: currentProyectosPorProfesor DESPUÉS de filtro de escuela:",
      currentProyectosPorProfesor.length,
      currentProyectosPorProfesor
    );

    if (selectedTematica !== "Todas las Temáticas") {
      currentProyectos = currentProyectos.filter(
        (p) => p.tematica === selectedTematica
      );
    }
    console.log(
      "DEBUG: currentProyectos DESPUÉS de filtro de temática:",
      currentProyectos.length,
      currentProyectos
    );

    if (selectedInstitucion !== "Todas las Instituciones") {
      currentProyectos = currentProyectos.filter(
        (p) => p.institucion === selectedInstitucion
      );
    }

    // Nuevo filtro por estatus
    if (selectedEstatus !== "Todos los Estatus") {
      currentProyectos = currentProyectos.filter(
        (p) => p.estatus === selectedEstatus
      );
    }

    console.log(
      "DEBUG: currentProyectos DESPUÉS de filtro de institución:",
      currentProyectos.length,
      currentProyectos
    );
    // 3. Recalcular datos para los gráficos basados en los `currentProyectos` filtrados
    setFilteredProyectosPorTematica(
      groupAndCount(currentProyectos, "tematica")
    );
    setFilteredProyectosPorInstitucion(
      groupAndCount(currentProyectos, "institucion")
    );

    // Actualizar estados de los gráficos
    // Gráfico: Profesores por Unidad Académica

    const dataProfesoresPorUnidad = currentProfesoresPorUnidad
      .filter((item) => item.NumeroDeProfesores > 0)
      .map((item) => ({
        unidad: item.UnidadAcademica, // Clave "unidad" para XAxis
        profesores: item.NumeroDeProfesores, // Clave "profesores" para Bar
      }))
      .sort((a, b) => b.profesores - a.profesores);
    console.log(
      "DEBUG: Data for Profesores por Unidad Académica:",
      dataProfesoresPorUnidad
    );
    setFilteredProfesoresPorUnidad(dataProfesoresPorUnidad);

    // Gráfico: Proyectos por Profesor
    const dataProyectosPorProfesor = currentProyectosPorProfesor
      .filter((p) => p.NumeroDeProyectos > 0) // Quitar este filtro temporalmente para ver si el array tiene datos
      .map((p) => ({
        profesor: `${p.NombreAcademico} ${p.ApellidoAcademico || ""}`.trim(),
        proyectos: p.NumeroDeProyectos,
      }))
      .sort((a, b) => b.proyectos - a.proyectos);
    // console.log("DEBUG: Data for Proyectos por Profesor:", dataProyectosPorProfesor); // Mantener para depuración
    setFilteredProyectosPorProfesor(dataProyectosPorProfesor);

    // Gráfico: Proyectos por Unidad (agrupado de `currentProyectos`)
    // Asegurarse de que `nombre_unidad_academica` exista y tenga valores para los proyectos
    const proyectosPorUnidadAgrupado = groupAndCount(
      currentProyectos,
      "unidad"
    );

    const dataProyectosPorUnidad = proyectosPorUnidadAgrupado
      .map((item) => ({
        unidad: item.name, // Clave "unidad" para XAxis
        proyectos: item.value, // Clave "proyectos" para Bar
      }))
      .filter((d) => d.proyectos > 0)
      .sort((a, b) => b.proyectos - a.proyectos);
    console.log(
      "DEBUG: Data for Proyectos por Unidad (nombre_unidad_academica):",
      dataProyectosPorUnidad
    );

    setFilteredProyectosPorUnidad(dataProyectosPorUnidad);

    // Recalcular Indicadores Principales Compactos
    const projectsInDashboard = proyectosData; // Estos no se filtran por ahora, son siempre los datos crudos

    const totalMonto = projectsInDashboard.reduce(
      (sum, item) => sum + (item.monto || 0),
      0
    );
    // Calcular escuelasFIN
    const escuelasConProfesores = new Set(
      projectsInDashboard.map((item) => item.unidad)
    ).size;

    // Calcular academicosInvolucrados: Profesores únicos de `proyectosPorProfesorData`
    const academicosUnicosEnProyectos = new Set(
      proyectosPorProfesorData.map(
        (p) => `${p.NombreAcademico} ${p.ApellidoAcademico}`
      )
    ).size;

    setIndicadoresPrincipales({
      proyectosEnCartera: projectsInDashboard.length,
      montoFormulado: formatMM(totalMonto),
      escuelasFIN: escuelasConProfesores,
      academicosInvolucrados: academicosUnicosEnProyectos,
    });

    // Actualizar tematicas e instrumentos postulados para las listas
    const countsTematicas = groupAndCount(projectsInDashboard, "tematica")
      .sort((a, b) => b.value - a.value)
      .map((item) => item.name)
      .slice(0, 6);
    setTematicasDestacadas(countsTematicas);

    const groupedInstruments = projectsInDashboard.reduce((acc, item) => {
      const key = `${item.institucion || "Desconocida"}`;
      if (!acc[key]) {
        acc[key] = { name: key, monto: 0 };
      }
      acc[key].monto += item.monto || 0; // Sumar montos
      return acc;
    }, {});

    const processedInstruments = Object.values(groupedInstruments)
      .map((instrument) => ({
        ...instrument,
        montoFormatted: formatMM(instrument.monto),
      }))
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 4);
    setInstrumentosPostulados(processedInstruments);
  }, [
    selectedEscuela,
    selectedTematica,
    selectedInstitucion,
    proyectosData,
    profesoresPorUnidadData, // Dependencia añadida
    proyectosPorProfesorData, // Dependencia añadida
    academicosData, // Dependencia añadida (aunque ahora menos crítica aquí)
    unidadesData, // Dependencia añadida
    formatMM, // Dependencia de la función helper
    selectedEstatus,
  ]);

  // ** Función para generar el PDF **
  const generarPDF = async () => {
    setLoadingExportPDF(true);
    try {
      const input = estadisticasContentRef.current; // Capturamos el contenedor principal

      if (!input) {
        console.error("No se encontró el elemento para exportar a PDF.");
        return;
      }

      // Calcular las dimensiones de la página A4 en mm
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth(); // Ancho real de la página en mm (aprox. 210)
      const pdfHeight = pdf.internal.pageSize.getHeight(); // Alto real de la página en mm (aprox. 297)

      // ** DEFINIR MÁRGENES (en mm) **
      const margin = 15; // Margen de 15mm en todos los lados
      const contentWidth = pdfWidth - margin * 2; // Ancho disponible para el contenido
      const contentHeight = pdfHeight - margin * 2; // Alto disponible para el contenido

      // Opciones para html2canvas para asegurar una buena calidad
      // Es posible que necesites ajustar windowWidth y windowHeight para asegurar
      // que html2canvas capture todo el scrollHeight/scrollWidth del elemento.
      // Esto es crucial si tu contenido puede tener scroll dentro del ref.
      const canvas = await html2canvas(input, {
        scale: 2, // Aumenta la resolución para mejor calidad en PDF (renderiza el doble de grande)
        useCORS: true, // Importante si tienes imágenes de diferentes dominios
        logging: true, // Para ver logs de html2canvas en consola (quitar en prod)
        windowWidth: input.scrollWidth, // Captura el ancho total del contenido
        windowHeight: input.scrollHeight, // Captura el alto total del contenido
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.8);

      // Calcular las dimensiones de la imagen para que quepa dentro de los márgenes
      let imgRatio = canvas.width / canvas.height; // Relación de aspecto del contenido capturado
      let imgDisplayWidth = contentWidth; // Ancho inicial para la imagen (será el ancho del contenido)
      let imgDisplayHeight = imgDisplayWidth / imgRatio; // Alto proporcional a ese ancho

      // Si la imagen, a su ancho completo, es más alta que el espacio disponible en la página,
      // entonces la ajustamos por la altura, manteniendo la proporción.
      if (imgDisplayHeight > contentHeight) {
        imgDisplayHeight = contentHeight;
        imgDisplayWidth = imgDisplayHeight * imgRatio;
      }

      let heightLeft = imgDisplayHeight;
      let position = margin; // Inicia la posición Y en el margen superior

      // Coordenada X inicial para centrar la imagen horizontalmente
      const startX = margin + (contentWidth - imgDisplayWidth) / 2;

      // Añadir el título y la fecha
      pdf.setFontSize(12); // Tamaño para el título
      pdf.text("Estadísticas del Dashboard", pdfWidth / 2, margin + 10, {
        align: "center",
      }); // Centra el títulof

      pdf.setFontSize(10); // Tamaño para la fecha
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      const dateString = `${day}-${month}-${year}`;
      pdf.text(
        `Fecha de Exportación: ${dateString}`,
        pdfWidth / 2,
        margin + 20,
        { align: "center" }
      ); // Centra la fecha

      // Ajustar la posición inicial de la imagen para dejar espacio al título y la fecha
      position = margin + 30; // 10 (margen inicial) + 22 (título) + 8 (espacio) + 12 (fecha) + 10 (espacio) = ~62mm de offset

      pdf.addImage(
        imgData,
        "PNG",
        startX,
        position,
        imgDisplayWidth,
        imgDisplayHeight
      );
      heightLeft -= pdfHeight - position; // Restar el espacio ya ocupado en la primera página

      // Si el contenido es más alto que una página, añadir más páginas
      while (heightLeft > 0) {
        position = -(imgDisplayHeight - (heightLeft + (pdfHeight - margin))); // Calcula la posición Y para el "corte" de la imagen en la nueva página
        pdf.addPage();
        pdf.addImage(
          imgData,
          "PNG",
          startX,
          position,
          imgDisplayWidth,
          imgDisplayHeight
        );
        heightLeft -= pdfHeight - margin;
      }

      // --- CAMBIOS AQUI: GENERAR EL NOMBRE DEL ARCHIVO CON FECHA EN FORMATO DD-MM-YYYY ---
      // Re-utilizamos la lógica de fecha
      const filename = `estadisticas_dashboard_${day}-${month}-${year}.pdf`;
      pdf.save(filename); // Guarda el PDF con el nombre generado
      // --- FIN CAMBIOS ---
    } catch (error) {
      console.error("Error al generar el PDF:", error);
      setErrorLocal("Error al generar el PDF. Intente de nuevo más tarde.");
    } finally {
      setLoadingExportPDF(false);
    }
  };

  return (
    <div className="h-full bg-gradient-to-br from-slate-50 to-blue-50 px-4 sm:px-6 lg:px-8 py-8">
      {loading ? (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-120px)]">
          {" "}
          {/* Centrar en pantalla */}
          <Spinner size={64} className="text-[#2E5C8A] mb-4" />
          <p className="text-lg text-gray-600">
            Cargando datos del dashboard... Por favor, espere.
          </p>
        </div>
      ) : errorLocal ? (
        <div className="max-w-7xl mx-auto py-8">
          {" "}
          {/* Contenedor para la alerta de error */}
          <Alert variant="destructive" className="bg-red-50 text-red-700">
            <XCircle className="h-5 w-5 mr-4" />
            <AlertTitle>Error al cargar las estadísticas</AlertTitle>
            <AlertDescription>{errorLocal}</AlertDescription>
          </Alert>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto space-y-4 ">
          {/* Título principal */}
          <div className="mb-2">
            <h2 className="text-3xl font-bold text-gray-900">Estadísticas</h2>
            <p className="text-gray-600">
              Datos para la toma de decisiones estratégicas
            </p>
          </div>
          <div className="flex justify-end">
            <Button
              variant="secondary"
              className="bg-red-500 text-md text-white hover:bg-red-600 cursor-pointer"
              onClick={generarPDF}
              disabled={loadingExportPDF}
            >
              {loadingExportPDF ? (
                <Spinner size={16} className="text-white mr-2" />
              ) : (
                <ArrowDownToLine className="w-5 h-5 mr-2" />
              )}
              Exportar a PDF
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <div>
              <label
                htmlFor="select-escuela"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Filtrar por Escuela
              </label>
              <Select
                onValueChange={setSelectedEscuela}
                value={selectedEscuela}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar Escuela" />
                </SelectTrigger>
                <SelectContent>
                  {opcionesEscuela.map((opcion) => (
                    <SelectItem key={opcion} value={opcion}>
                      {opcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label
                htmlFor="select-tematica"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Filtrar por Temática
              </label>
              <Select
                onValueChange={setSelectedTematica}
                value={selectedTematica}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar Temática" />
                </SelectTrigger>
                <SelectContent>
                  {opcionesTematica.map((opcion) => (
                    <SelectItem key={opcion} value={opcion}>
                      {opcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label
                htmlFor="select-institucion"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Filtrar por Tipo de Fondo
              </label>
              <Select
                onValueChange={setSelectedInstitucion}
                value={selectedInstitucion}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar Institución" />
                </SelectTrigger>
                <SelectContent>
                  {opcionesInstitucion.map((opcion) => (
                    <SelectItem key={opcion} value={opcion}>
                      {opcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Nuevo Filtro por Estatus */}
            <div>
              <label
                htmlFor="select-estatus"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Filtrar por Estatus
              </label>
              <Select
                onValueChange={setSelectedEstatus}
                value={selectedEstatus}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todos los Estatus" />
                </SelectTrigger>
                <SelectContent>
                  {opcionesEstatus.map((opcion) => (
                    <SelectItem key={opcion} value={opcion}>
                      {opcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-1 flex items-end">
              {" "}
              {/* md:col-span-1 para que ocupe una columna y flex items-end para alinear abajo */}
              <Button
                onClick={resetFilters}
                className="w-full cursor-pointer px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Limpiar Filtros
              </Button>
            </div>
          </div>

          <div
            className="grid grid-cols-1 lg:grid-cols-[1.2fr_2fr_2fr] gap-8 mb-8"
            ref={estadisticasContentRef}
          >
            {" "}
            {/* Grid principal: 1 col móvil, 3 en grandes */}
            {/* COLUMNA 1: Indicadores y Resúmenes */}
            <div className="space-y-8">
              {" "}
              {/* h-full para estirar verticalmente */}
              {/* Indicadores Principales Compactos */}
              <div className="grid grid-cols-1 gap-4">
                {/* Indicador: Proyectos en Cartera */}
                <div className=" bg-[#e1edfd] rounded-lg p-4 shadow-sm border border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Proyectos en Cartera
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {indicadoresPrincipales.proyectosEnCartera}
                    </p>
                  </div>
                  <FileText className="w-6 h-6 text-gray-700 opacity-70" />
                </div>
                {/* Indicador: MM$ Formulados */}
                <div className="bg-[#e1edfd]  rounded-lg p-4 shadow-sm border border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      MM$ Formulados
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {indicadoresPrincipales.montoFormulado}
                    </p>
                  </div>
                  <DollarSign className="w-6 h-6 text-gray-700 opacity-70" />
                </div>
                {/* Indicador: Escuelas FIN */}
                <div className="bg-[#e1edfd]  rounded-lg p-4 shadow-sm border border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Escuelas FIN
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {indicadoresPrincipales.escuelasFIN}
                    </p>
                  </div>
                  <GraduationCap className="w-6 h-6 text-gray-700 opacity-70" />
                </div>
                {/* Indicador: Académicos Involucrados */}
                <div className="bg-[#e1edfd]  rounded-lg p-4 shadow-sm border border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Académicos Involucrados
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {indicadoresPrincipales.academicosInvolucrados}
                    </p>
                  </div>
                  <Users className="w-6 h-6 text-gray-700 opacity-70" />
                </div>
                {/* Indicador: Empresas Partners */}
                <div className="bg-[#e1edfd] rounded-lg p-4 shadow-sm border border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Empresas Partners
                    </p>
                    <p className="text-2xl font-bold text-gray-900">12</p>
                  </div>
                  <Building2 className="w-6 h-6 text-gray-700 opacity-70" />
                </div>
                {/* Indicador: Universidades Partners */}
                <div className="bg-[#e1edfd]  rounded-lg p-4 shadow-sm border border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Universidades Partners
                    </p>
                    <p className="text-2xl font-bold text-gray-900">5</p>
                  </div>
                  <University className="w-6 h-6 text-gray-700 opacity-70" />
                </div>
              </div>{" "}
              {/* Fin del grid de indicadores pequeños */}
              {/* Temáticas Destacadas - Tarjeta Compacta */}
              <div className="bg-[#e1edfd]  items-center  rounded-xl p-6 text-gray-900 shadow-lg border border-gray-100">
                <h3 className="text-lg text-center font-semibold mb-4">
                  Temáticas Destacadas
                </h3>
                <div className="flex flex-col gap-2">
                  {tematicasDestacadas.map((tematica, index) => (
                    <span
                      key={index}
                      className="bg-slate-50 text-blue-800 px-3 py-1 rounded-full text-center text-sm font-medium"
                    >
                      {tematica}
                    </span>
                  ))}
                </div>
              </div>
              {/* Instrumentos Postulados - Tarjeta Compacta */}
              <div className="bg-[#e1edfd]  rounded-xl p-6 text-gray-900 shadow-lg border border-gray-100">
                <h3 className="text-lg  text-center font-semibold mb-4">
                  Instrumentos Postulados
                </h3>
                <div className="flex flex-col ">
                  {instrumentosPostulados.map((instrumento, index) => (
                    <div className="flex items-center mb-2 gap-4">
                      {" "}
                      {renderInstitucionLogo(instrumento.name || "")}
                      <span>{instrumento.name || "Sin información"}</span>
                      <span className="font-semibold">
                        {instrumento.montoFormatted}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>{" "}
            {/* Fin de la COLUMNA 1 */}
            {/* COLUMNA 2: Gráficos de Barras (Profesores por Unidad y Proyectos por Profesor) */}
            <div className="space-y-8">
              {" "}
              {/* Ocupa 1/3 del ancho, y deja espacio entre gráficos */}
              {/* Proyectos por Profesor - Gráfico de Barras */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900">
                  Proyectos por Profesor
                </h4>
                <h4 className="text-s text-gray-500 mb-4">
                  Cantidad de proyectos en los que ha participado cada profesor.
                </h4>
                <div className="h-80 flex items-center justify-center">
                  {filteredProyectosPorProfesor.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={filteredProyectosPorProfesor}
                        margin={{ top: 10, right: 30, bottom: 80, left: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          allowDecimals={false}
                          dataKey="profesor"
                          angle={-45}
                          textAnchor="end"
                          height={120} // Más altura para las etiquetas rotadas
                          fontSize={11} // Reducir un poco el tamaño de la fuente
                          interval={2}
                        />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="proyectos" fill="#7facea" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-gray-500">
                      No hay datos de proyectos por profesor para la selección
                      actual.
                    </p>
                  )}
                </div>
              </div>
              {/* Proyectos por Unidad (Gráfico de Barras - Ahora integrado en la tercera columna) */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                {" "}
                {/* Sin mb-8 para que el space-y-8 lo controle */}
                <h4 className="text-lg font-semibold text-gray-900">
                  Proyectos por Unidad Académica
                </h4>
                <h4 className="text-s text-gray-500 mb-4">
                  Número total de proyectos por cada unidad académica de los
                  profesores involucrados.
                </h4>
                <div className="h-80 flex items-center justify-center">
                  {filteredProyectosPorUnidad.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={filteredProyectosPorUnidad}
                        margin={{ top: 20, right: 30, bottom: 80, left: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          allowDecimals={false}
                          dataKey="unidad"
                          angle={-45}
                          textAnchor="end"
                          height={120} // Más altura para las etiquetas rotadas
                          fontSize={11} // Reducir un poco el tamaño de la fuente
                          interval={0}
                        />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="proyectos" fill="#7CA3CB" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-gray-500">
                      No hay datos de proyectos por unidad para la selección
                      actual.
                    </p>
                  )}
                </div>
              </div>
              {/* Profesores por Unidad Académica - Gráfico de Barras */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900">
                  Profesores por Unidad Académica
                </h4>
                <h4 className="text-s text-gray-500 mb-4">
                  Cantidad de profesores agrupados por unidad académica.
                </h4>
                <div className="h-80 flex items-center justify-center">
                  {filteredProfesoresPorUnidad.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={filteredProfesoresPorUnidad}
                        margin={{ top: 40, right: 30, bottom: 80, left: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          allowDecimals={false}
                          dataKey="unidad"
                          angle={-45}
                          textAnchor="end"
                          height={120} // Más altura para las etiquetas rotadas
                          fontSize={11} // Reducir un poco el tamaño de la fuente
                          interval={0}
                        />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="profesores" fill="#2E5C8A" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-gray-500">
                      No hay datos de profesores para la selección actual.
                    </p>
                  )}
                </div>
              </div>
            </div>{" "}
            {/* Fin de la COLUMNA 2 */}
            {/* COLUMNA 3: Gráficos de Torta (Proyectos por Temática, Proyectos por Convocatoria, y Proyectos por Unidad) */}
            <div className="lg:col-span-1 space-y-8">
              {" "}
              {/* Ocupa 1/3 del ancho, y deja espacio entre gráficos */}
              {/* Proyectos por Temática (Bar Chart horizontal) */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900">
                  Proyectos por Temática
                </h4>
                <h4 className="text-s text-gray-500 mb-4">
                  Distribución de los proyectos según su área temática
                  principal.
                </h4>
                <div className="h-80 flex items-center justify-center">
                  {filteredProyectosPorTematica.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={filteredProyectosPorTematica}
                        layout="vertical"
                        margin={{
                          top: 20,
                          right: 30,
                          left: 100, // Ajusta este valor: Mayor para etiquetas más largas
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" allowDecimals={false} />{" "}
                        {/* Eje X es numérico */}
                        <YAxis
                          type="category"
                          dataKey="name" // `name` de { name, value } del groupAndCount
                          textAnchor="end" // Alinea el texto a la derecha (fin)
                          width={100} // Aumenta el ancho del área de la etiqueta Y
                          fontSize={12}
                          tickFormatter={(value) => `${value}`}
                          interval={2}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="value" fill="#457dca" />{" "}
                        {/* `value` de { name, value } del groupAndCount */}
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-gray-500">
                      No hay datos de proyectos por temática para la selección
                      actual.
                    </p>
                  )}
                </div>
              </div>
              {/* Proyectos por Convocatoria (Pie Chart) */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900">
                  Proyectos por Tipo de Fondo
                </h4>
                <h4 className="text-s text-gray-500 mb-4">
                  Cantidad de proyectos según la institución o instrumento de
                  financiamiento.
                </h4>
                <div className="h-80 flex items-center justify-center">
                  {filteredProyectosPorInstitucion.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={filteredProyectosPorInstitucion}
                        layout="vertical" // Gráfico de barras horizontal
                        margin={{
                          top: 20,
                          right: 30,
                          left: 100, // Espacio para las etiquetas del eje Y
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          textAnchor="end"
                          width={100} // Ancho para las etiquetas
                          fontSize={12}
                          interval={0} // Mantener todas las etiquetas para este gráfico, o ajusta a 1 o 2 si se superponen mucho
                        />
                        <Tooltip content={<CustomTooltip />} />{" "}
                        {/* Reutilizar el CustomTooltip */}
                        <Bar dataKey="value" fill="#77C3ED" />{" "}
                        {/* Usar un color consistente de tu paleta */}
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-gray-500">
                      No hay datos de proyectos por institución para la
                      selección actual.
                    </p>
                  )}
                </div>
              </div>
            </div>{" "}
            {/* Fin de la COLUMNA 3 */}
          </div>
        </div>
      )}
    </div>
  );
}
