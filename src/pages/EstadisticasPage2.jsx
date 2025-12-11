import { useState, useEffect, useCallback, useRef } from "react";
// Lucide icons
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

// PDF export libraries
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { autoTable } from "jspdf-autotable";

// Recharts imports - AHORA SERÁN REEMPLAZADOS POR Chart.js
// import {
//   PieChart as RechartsPieChart,
//   Cell,
//   BarChart,
//   Bar,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   ResponsiveContainer,
//   Pie,
//   Text,
// } from "recharts";

// Chart.js imports
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Custom component for logo rendering
import { renderInstitucionLogo } from "./components/ProjectCard.jsx";

// UI components
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

// API services
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
  const [allInstrumentosForPdf, setAllInstrumentosForPdf] = useState([]);

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

  // Paleta de azules (mantener consistente para los gráficos de barras)
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
      const keyValue = item[`${key}_nombre`] || item[key];
      if (keyValue) {
        counts[keyValue] = (counts[keyValue] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  };

  // Helper para formatear montos a MM$
  const formatMM = useCallback((monto) => {
    if (monto === null || monto === undefined || isNaN(monto)) return "0 MM$";
    const numericMonto = parseFloat(monto);
    if (isNaN(numericMonto)) return "0 MM$";
    return `${(numericMonto / 1000000).toLocaleString("es-CL", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    })} MM$`;
  }, []);

  // Custom Tooltip (not used directly by Chart.js, Chart.js has its own built-in)
  // const CustomTooltip = ({ active, payload, label }) => { ... };

  const fetchDashboardData = async () => {
    setLoading(true);
    setErrorLocal(null);
    setErrorGlobal(null);
    try {
      const [
        proyectosRes,
        profesoresPorUnidadRes,
        proyectosPorProfesorRes,
        unidadesRes,
      ] = await Promise.all([
        funcionesService.getDataInterseccionProyectos(),
        estadisticasService.getAcademicosPorUnidad(),
        estadisticasService.getProyectosPorProfesor(),
        unidadesAcademicasService.getAllUnidadesAcademicas(),
      ]);

      const newUnidadesMap = unidadesRes.reduce((map, unidad) => {
        map[unidad.id_unidad] = unidad;
        return map;
      }, {});
      setUnidadesMap(newUnidadesMap);
      setUnidadesData(unidadesRes);

      setProyectosData(proyectosRes);
      setProyectosPorProfesorData(proyectosPorProfesorRes);
      setProfesoresPorUnidadData(profesoresPorUnidadRes);

      setAcademicosData([]);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setErrorGlobal({
        type: "error",
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

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // --- Lógica de filtrado ---
  useEffect(() => {
    let currentProyectos = proyectosData;
    let currentProfesoresPorUnidad = profesoresPorUnidadData;
    let currentProyectosPorProfesor = proyectosPorProfesorData;

    // Filtro por escuela
    if (selectedEscuela !== "Todas las Escuelas") {
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
      currentProyectos = proyectosData;
      currentProfesoresPorUnidad = profesoresPorUnidadData;
      currentProyectosPorProfesor = proyectosPorProfesorData;
    }

    if (selectedTematica !== "Todas las Temáticas") {
      currentProyectos = currentProyectos.filter(
        (p) => p.tematica === selectedTematica
      );
    }

    if (selectedInstitucion !== "Todas las Instituciones") {
      currentProyectos = currentProyectos.filter(
        (p) => p.institucion === selectedInstitucion
      );
    }

    if (selectedEstatus !== "Todos los Estatus") {
      currentProyectos = currentProyectos.filter(
        (p) => p.estatus === selectedEstatus
      );
    }

    // Prepare data for Chart.js
    // Proyectos por Temática
    setFilteredProyectosPorTematica(
      groupAndCount(currentProyectos, "tematica")
    );
    // Proyectos por Tipo de Fondo
    setFilteredProyectosPorInstitucion(
      groupAndCount(currentProyectos, "institucion")
    );

    // Profesores por Unidad Académica
    const dataProfesoresPorUnidad = currentProfesoresPorUnidad
      .filter((item) => item.NumeroDeProfesores > 0)
      .map((item) => ({
        unidad: item.UnidadAcademica,
        profesores: item.NumeroDeProfesores,
      }))
      .sort((a, b) => b.profesores - a.profesores);
    setFilteredProfesoresPorUnidad(dataProfesoresPorUnidad);

    // Proyectos por Profesor
    const dataProyectosPorProfesor = currentProyectosPorProfesor
      .filter((p) => p.NumeroDeProyectos > 0)
      .map((p) => ({
        profesor: `${p.NombreAcademico} ${p.ApellidoAcademico || ""}`.trim(),
        proyectos: p.NumeroDeProyectos,
      }))
      .sort((a, b) => b.proyectos - a.proyectos);
    setFilteredProyectosPorProfesor(dataProyectosPorProfesor);

    // Proyectos por Unidad
    const proyectosPorUnidadAgrupado = groupAndCount(
      currentProyectos,
      "unidad"
    );
    const dataProyectosPorUnidad = proyectosPorUnidadAgrupado
      .map((item) => ({
        unidad: item.name,
        proyectos: item.value,
      }))
      .filter((d) => d.proyectos > 0)
      .sort((a, b) => b.proyectos - a.proyectos);
    setFilteredProyectosPorUnidad(dataProyectosPorUnidad);

    // Recalcular Indicadores Principales Compactos
    const projectsInDashboard = proyectosData;

    const totalMonto = projectsInDashboard.reduce(
      (sum, item) => sum + (item.monto || 0),
      0
    );
    const escuelasConProfesores = new Set(
      projectsInDashboard.map((item) => item.unidad)
    ).size;
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

    const countsTematicas = groupAndCount(projectsInDashboard, "tematica")
      .sort((a, b) => b.value - a.value)
      .map((item) => item.name)
      .slice(0, 6);
    setTematicasDestacadas(countsTematicas);

    const groupedInstruments = projectsInDashboard.reduce((acc, item) => {
      const key = `${item.institucion || "Sin instrumento"}`;
      if (!acc[key]) {
        acc[key] = { name: key, monto: 0 };
      }
      acc[key].monto += item.monto || 0;
      return acc;
    }, {});

    const processedInstrumentsForPdf = Object.values(groupedInstruments)
      .map((instrument) => ({
        ...instrument,
        montoFormatted: formatMM(instrument.monto),
      }))
      .sort((a, b) => b.monto - a.monto);

    const processedInstruments = Object.values(groupedInstruments)
      .map((instrument) => ({
        ...instrument,
        montoFormatted: formatMM(instrument.monto),
      }))
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 5);

    setAllInstrumentosForPdf(processedInstrumentsForPdf);
    setInstrumentosPostulados(processedInstruments);
  }, [
    selectedEscuela,
    selectedTematica,
    selectedInstitucion,
    proyectosData,
    profesoresPorUnidadData,
    proyectosPorProfesorData,
    unidadesData,
    formatMM,
    selectedEstatus,
  ]);

  // --- Chart.js Data & Options configurations ---

  // #region Chart: Proyectos por Profesor
  const dataChartProyectosPorProfesor = {
    labels: filteredProyectosPorProfesor.map((d) => d.profesor),
    datasets: [
      {
        label: "Proyectos",
        data: filteredProyectosPorProfesor.map((d) => d.proyectos),
        backgroundColor: bluePalette[0], // Using the first blue
      },
    ],
  };

  const optionsChartProyectosPorProfesor = {
    responsive: true,
    maintainAspectRatio: false, // Allows chart to fit parent div
    indexAxis: "x", // Vertical bars
    plugins: {
      legend: {
        display: false, // Hide legend if only one dataset
      },
      title: {
        display: false, // Title already in HTML
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || "";
            if (label) {
              label += ": ";
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y;
            }
            return label;
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: false,
        },
        ticks: {
          // You can use a callback to conditionally hide labels
          autoSkip: true, // Let Chart.js decide skipping
          maxRotation: 45, // Rotate labels for better fit
          minRotation: 45,
          // Custom callback to skip labels if needed, more flexible than fixed interval
          // callback: function(val, index) {
          //   return index % 2 === 0 ? this.getLabelForValue(val) : '';
          // },
          font: {
            size: 11, // Match Recharts font size
          },
        },
        grid: {
          display: false, // Hide vertical grid lines
        },
      },
      y: {
        title: {
          display: false,
        },
        beginAtZero: true,
        ticks: {
          precision: 0, // No decimals for count
        },
        grid: {
          color: "rgba(0, 0, 0, 0.05)", // Light horizontal grid
        },
      },
    },
  };
  // #endregion

  // #region Chart: Proyectos por Unidad Académica
  const dataChartProyectosPorUnidad = {
    labels: filteredProyectosPorUnidad.map((d) => d.unidad),
    datasets: [
      {
        label: "Proyectos",
        data: filteredProyectosPorUnidad.map((d) => d.proyectos),
        backgroundColor: bluePalette[2], // Different shade of blue
      },
    ],
  };

  const optionsChartProyectosPorUnidad = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "x",
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || "";
            if (label) {
              label += ": ";
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y;
            }
            return label;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          autoSkip: true,
          maxRotation: 45,
          minRotation: 45,
          font: {
            size: 11,
          },
        },
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
      },
    },
  };
  // #endregion

  // #region Chart: Profesores por Unidad Académica
  const dataChartProfesoresPorUnidad = {
    labels: filteredProfesoresPorUnidad.map((d) => d.unidad),
    datasets: [
      {
        label: "Profesores",
        data: filteredProfesoresPorUnidad.map((d) => d.profesores),
        backgroundColor: bluePalette[0], // Primary blue
      },
    ],
  };

  const optionsChartProfesoresPorUnidad = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "x",
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || "";
            if (label) {
              label += ": ";
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y;
            }
            return label;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          autoSkip: true,
          maxRotation: 45,
          minRotation: 45,
          font: {
            size: 11,
          },
        },
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
      },
    },
  };
  // #endregion

  // #region Chart: Proyectos por Temática (Horizontal Bar Chart)
  const dataChartProyectosPorTematica = {
    labels: filteredProyectosPorTematica.map((d) => d.name),
    datasets: [
      {
        label: "Proyectos",
        data: filteredProyectosPorTematica.map((d) => d.value),
        backgroundColor: bluePalette[3], // Accent blue
      },
    ],
  };

  const optionsChartProyectosPorTematica = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y", // Horizontal bars
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || "";
            if (label) {
              label += ": ";
            }
            if (context.parsed.x !== null) {
              label += context.parsed.x; // For horizontal bar, value is on x-axis
            }
            return label;
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
      },
      y: {
        ticks: {
          autoSkip: true, // Let Chart.js decide skipping
          font: {
            size: 12,
          },
        },
        grid: {
          display: false,
        },
      },
    },
  };
  // #endregion

  // #region Chart: Proyectos por Tipo de Fondo (Horizontal Bar Chart)
  const dataChartProyectosPorInstitucion = {
    labels: filteredProyectosPorInstitucion.map((d) => d.name),
    datasets: [
      {
        label: "Proyectos",
        data: filteredProyectosPorInstitucion.map((d) => d.value),
        backgroundColor: bluePalette[6],
      },
    ],
  };

  const optionsChartProyectosPorInstitucion = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y", // Horizontal bars
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || "";
            if (label) {
              label += ": ";
            }
            if (context.parsed.x !== null) {
              label += context.parsed.x;
            }
            return label;
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
      },
      y: {
        ticks: {
          autoSkip: true,
          font: {
            size: 12,
          },
        },
        grid: {
          display: false,
        },
      },
    },
  };
  // #endregion

  // Función para generar el PDF
  const generarPDF = async () => {
    setLoadingExportPDF(true);
    try {
      const doc = new jsPDF("p", "mm", "a4"); // Instancia de jsPDF
      const pdfWidth = doc.internal.pageSize.getWidth();
      const pdfHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pdfWidth - margin * 2;

      // --- Página de los Gráficos (Imagen) ---
      const input = estadisticasContentRef.current;
      if (!input) {
        console.error("No se encontró el elemento para exportar a PDF.");
        setLoadingExportPDF(false);
        return;
      }

      const canvas = await html2canvas(input, {
        scale: 2,
        useCORS: true,
        logging: true,
        windowWidth: input.scrollWidth,
        windowHeight: input.scrollHeight,
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.8);

      let imgRatio = canvas.width / canvas.height;
      let imgDisplayWidth = contentWidth;
      let imgDisplayHeight = imgDisplayWidth / imgRatio;

      if (imgDisplayHeight > pdfHeight - margin * 2 - 30) {
        imgDisplayHeight = pdfHeight - margin * 2 - 30;
        imgDisplayWidth = imgDisplayHeight * imgRatio;
      }

      let yPos = margin + 30; // Inicia después del título y la fecha

      doc.setFontSize(12);
      doc.text("Estadísticas del Dashboard", pdfWidth / 2, margin + 10, {
        align: "center",
      });
      doc.setFontSize(10);
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      const dateString = `${day}-${month}-${year}`;
      doc.text(
        `Fecha de Exportación: ${dateString}`,
        pdfWidth / 2,
        margin + 20,
        { align: "center" }
      );

      const startX = margin + (contentWidth - imgDisplayWidth) / 2;
      doc.addImage(
        imgData,
        "PNG",
        startX,
        yPos,
        imgDisplayWidth,
        imgDisplayHeight
      );

      // --- Sección de Datos Tabulares (Nuevas Páginas) ---
      doc.addPage(); // Añadir una nueva página para las tablas

      let currentY = margin + 10; // Posición Y para el contenido en la nueva página

      // Función auxiliar para añadir títulos de sección y verificar si cabe la tabla
      const addSectionTitle = (titleText) => {
        if (currentY + 20 > pdfHeight - margin) {
          // Margen de seguridad para el título
          doc.addPage();
          currentY = margin + 10;
        }
        doc.setFontSize(14);
        doc.setTextColor(46, 92, 138); // Color azul similar al de la paleta
        doc.text(titleText, margin, currentY);
        doc.setTextColor(0); // Resetear a negro
        currentY += 10; // Espacio después del título
      };

      // 1. Tabla de Proyectos por Profesor
      addSectionTitle("Datos: Proyectos por Profesor");
      if (filteredProyectosPorProfesor.length > 0) {
        const headers = [["Profesor", "Proyectos"]];
        const body = filteredProyectosPorProfesor.map((item) => [
          item.profesor,
          item.proyectos,
        ]);
        autoTable(doc, {
          // <-- CORRECTO: Llamada a autoTable directamente
          startY: currentY,
          head: headers,
          body: body,
          margin: { left: margin, right: margin },
          styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
          headStyles: {
            fillColor: [46, 92, 138],
            textColor: 255,
            fontStyle: "bold",
          },
          didDrawPage: (data) => {
            currentY = data.cursor.y + 10;
          },
        });
      } else {
        doc.setFontSize(10);
        doc.text("No hay datos de proyectos por profesor.", margin, currentY);
        currentY += 10;
      }
      currentY += 10;

      // 2. Tabla de Proyectos por Unidad Académica
      addSectionTitle("Datos: Proyectos por Unidad Académica");
      if (filteredProyectosPorUnidad.length > 0) {
        const headers = [["Unidad Académica", "Proyectos"]];
        const body = filteredProyectosPorUnidad.map((item) => [
          item.unidad,
          item.proyectos,
        ]);
        autoTable(doc, {
          // <-- CORRECTO: Llamada a autoTable directamente
          startY: currentY,
          head: headers,
          body: body,
          margin: { left: margin, right: margin },
          styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
          headStyles: {
            fillColor: [93, 149, 200],
            textColor: 255,
            fontStyle: "bold",
          },
          didDrawPage: (data) => {
            currentY = data.cursor.y + 10;
          },
        });
      } else {
        doc.setFontSize(10);
        doc.text(
          "No hay datos de proyectos por unidad académica.",
          margin,
          currentY
        );
        currentY += 10;
      }
      currentY += 10;

      // 3. Tabla de Profesores por Unidad Académica
      addSectionTitle("Datos: Profesores por Unidad Académica");
      if (filteredProfesoresPorUnidad.length > 0) {
        const headers = [["Unidad Académica", "Profesores"]];
        const body = filteredProfesoresPorUnidad.map((item) => [
          item.unidad,
          item.profesores,
        ]);
        autoTable(doc, {
          // <-- CORRECTO: Llamada a autoTable directamente
          startY: currentY,
          head: headers,
          body: body,
          margin: { left: margin, right: margin },
          styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
          headStyles: {
            fillColor: [46, 92, 138],
            textColor: 255,
            fontStyle: "bold",
          },
          didDrawPage: (data) => {
            currentY = data.cursor.y + 10;
          },
        });
      } else {
        doc.setFontSize(10);
        doc.text(
          "No hay datos de profesores por unidad académica.",
          margin,
          currentY
        );
        currentY += 10;
      }
      currentY += 10;

      // 4. Tabla de Proyectos por Temática
      addSectionTitle("Datos: Proyectos por Temática");
      if (filteredProyectosPorTematica.length > 0) {
        const headers = [["Temática", "Proyectos"]];
        const body = filteredProyectosPorTematica.map((item) => [
          item.name,
          item.value,
        ]);
        autoTable(doc, {
          // <-- CORRECTO: Llamada a autoTable directamente
          startY: currentY,
          head: headers,
          body: body,
          margin: { left: margin, right: margin },
          styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
          headStyles: {
            fillColor: [59, 130, 246],
            textColor: 255,
            fontStyle: "bold",
          },
          didDrawPage: (data) => {
            currentY = data.cursor.y + 10;
          },
        });
      } else {
        doc.setFontSize(10);
        doc.text("No hay datos de proyectos por temática.", margin, currentY);
        currentY += 10;
      }
      currentY += 10;

      // 5. Tabla de Proyectos por Tipo de Fondo (Refleja el Bar Chart SIMPLE)
      // Usaremos filteredProyectosPorInstitucion directamente
      addSectionTitle("Datos: Proyectos por Tipo de Fondo");
      if (filteredProyectosPorInstitucion.length > 0) {
        const headers = [["Tipo de Fondo", "Proyectos"]];
        const body = filteredProyectosPorInstitucion.map((item) => [
          item.name,
          item.value,
        ]);
        autoTable(doc, {
          // <-- CORRECTO: Llamada a autoTable directamente
          startY: currentY,
          head: headers,
          body: body,
          margin: { left: margin, right: margin },
          styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
          headStyles: {
            fillColor: [30, 58, 92],
            textColor: 255,
            fontStyle: "bold",
          },
          didDrawPage: (data) => {
            currentY = data.cursor.y + 10;
          },
        });
      } else {
        doc.setFontSize(10);
        doc.text(
          "No hay datos de proyectos por tipo de fondo.",
          margin,
          currentY
        );
        currentY += 10;
      }
      currentY += 10;

      // 6. Tabla de Instrumentos Postulados (de la lista compacta)
      addSectionTitle("Datos: Instrumentos Postulados (Todos)");
      if (allInstrumentosForPdf.length > 0) {
        const headers = [["Instrumento", "Monto Formulados"]];
        const body = allInstrumentosForPdf.map((item) => [
          item.name,
          item.montoFormatted,
        ]);
        autoTable(doc, {
          // <-- CORRECTO: Llamada a autoTable directamente
          startY: currentY,
          head: headers,
          body: body,
          margin: { left: margin, right: margin },
          styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
          headStyles: {
            fillColor: [74, 122, 159],
            textColor: 255,
            fontStyle: "bold",
          },
          didDrawPage: (data) => {
            currentY = data.cursor.y + 10;
          },
        });
      } else {
        doc.setFontSize(10);
        doc.text(
          "No hay instrumentos postulados disponibles.",
          margin,
          currentY
        );
        currentY += 10;
      }

      const filename = `estadisticas_dashboard_${day}-${month}-${year}.pdf`;
      doc.save(filename);
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
                <h3 className="text-lg text-center font-semibold">
                  Temáticas Destacadas
                </h3>
                <h3 className="text-sm text-gray-500 text-center font-semibold mb-4">
                  Top 6 (por Proyecto)
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
                <h3 className="text-lg  text-center font-semibold">
                  Instrumentos Postulados
                </h3>
                <h3 className="text-sm text-gray-500 text-center font-semibold mb-4">
                  Top 5 (por Monto)
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
                <h4 className="text-sm text-gray-600">
                  <strong>Datos que muestra:</strong> Cantidad de proyectos en
                  los que ha participado cada profesor.
                </h4>
                <h4 className="text-sm text-gray-600 mb-4">
                  <strong>Insight principal:</strong> Identificar a los
                  profesores más activos o con mayor participación en proyectos.
                </h4>
                <div className="h-80 flex items-center justify-center">
                  {filteredProyectosPorProfesor.length > 0 ? (
                    <Bar
                      data={dataChartProyectosPorProfesor}
                      options={optionsChartProyectosPorProfesor}
                    />
                  ) : (
                    <p className="text-gray-500">
                      No hay datos de proyectos por profesor para la selección
                      actual.
                    </p>
                  )}
                </div>
              </div>
              {/* Proyectos por Unidad (Gráfico de Barras) */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                {" "}
                <h4 className="text-lg font-semibold text-gray-900">
                  Proyectos por Unidad Académica
                </h4>
                <h4 className="text-sm text-gray-600">
                  <strong>Datos que muestra:</strong> Número total de proyectos
                  por cada unidad académica.
                </h4>
                <h4 className="text-sm text-gray-600 mb-4">
                  <strong>Insight principal:</strong> Identificar qué unidades
                  son más productivas en términos de proyectos.
                </h4>
                <div className="h-80 flex items-center justify-center">
                  {filteredProyectosPorUnidad.length > 0 ? (
                    <Bar
                      data={dataChartProyectosPorUnidad}
                      options={optionsChartProyectosPorUnidad}
                    />
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
                <h4 className="text-sm text-gray-600">
                  <strong>Datos que muestra:</strong> Cantidad de profesores
                  agrupados por unidad académica.
                </h4>
                <h4 className="text-sm text-gray-600 mb-4">
                  <strong>Insight principal:</strong> Mostrar la distribución de
                  los académicos en las diferentes unidades.
                </h4>
                <div className="h-80 flex items-center justify-center">
                  {filteredProfesoresPorUnidad.length > 0 ? (
                    <Bar
                      data={dataChartProfesoresPorUnidad}
                      options={optionsChartProfesoresPorUnidad}
                    />
                  ) : (
                    <p className="text-gray-500">
                      No hay datos de profesores para la selección actual.
                    </p>
                  )}
                </div>
              </div>
            </div>{" "}
            {/* Fin de la COLUMNA 2 */}
            {/* COLUMNA 3: Gráficos de Barras (Proyectos por Temática, Proyectos por Tipo de Fondo) */}
            <div className="lg:col-span-1 space-y-8">
              {" "}
              {/* Ocupa 1/3 del ancho, y deja espacio entre gráficos */}
              {/* Proyectos por Temática (Bar Chart horizontal) */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900">
                  Proyectos por Temática
                </h4>
                <h4 className="text-sm text-gray-600">
                  <strong>Datos que muestra:</strong> Distribución de los
                  proyectos según su área temática principal.
                </h4>
                <h4 className="text-sm text-gray-600 mb-4">
                  <strong>Insight principal:</strong> Identificar las temáticas
                  más prevalentes o con mayor inversión/actividad.
                </h4>
                <div className="h-80 flex items-center justify-center">
                  {filteredProyectosPorTematica.length > 0 ? (
                    <Bar
                      data={dataChartProyectosPorTematica}
                      options={optionsChartProyectosPorTematica}
                    />
                  ) : (
                    <p className="text-gray-500">
                      No hay datos de proyectos por temática para la selección
                      actual.
                    </p>
                  )}
                </div>
              </div>
              {/* Proyectos por Tipo de Fondo (Bar Chart horizontal) */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900">
                  Proyectos por Tipo de Fondo
                </h4>
                <h4 className="text-sm text-gray-600">
                  <strong>Datos que muestra:</strong> Cantidad de proyectos
                  según la institución o instrumento de financiamiento.
                </h4>
                <h4 className="text-sm text-gray-600 mb-4">
                  <strong>Insight principal:</strong> Entender qué instrumentos
                  son más utilizados.
                </h4>
                <div className="h-80 flex items-center justify-center">
                  {filteredProyectosPorInstitucion.length > 0 ? (
                    <Bar
                      data={dataChartProyectosPorInstitucion}
                      options={optionsChartProyectosPorInstitucion}
                    />
                  ) : (
                    <p className="text-gray-500">
                      No hay datos de proyectos por tipo de fondo para la
                      selección actual.
                    </p>
                  )}
                </div>
              </div>
            </div>
            {/* Fin de la COLUMNA 3 */}
          </div>
        </div>
      )}
    </div>
  );
}
