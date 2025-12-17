// src/pages/EstadisticasPage.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Building2,
  DollarSign,
  FileText,
  GraduationCap,
  Users,
  University,
  ArrowDownToLine,
  XCircle,
} from "lucide-react";

// PDF export libraries
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { autoTable } from "jspdf-autotable";

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

export default function EstadisticasPage() {
  const VITE_URL_BACKEND = import.meta.env.VITE_URL_BACKEND;

  const [proyectosData, setProyectosData] = useState([]);
  const [profesoresPorUnidadData, setProfesoresPorUnidadData] = useState([]);
  const [proyectosPorProfesorData, setProyectosPorProfesorData] = useState([]);

  const [indicadoresPrincipales, setIndicadoresPrincipales] = useState({
    proyectosEnCartera: 0,
    montoFormulado: "0 MM$",
    escuelasFIN: 0,
    academicosInvolucrados: 0,
  });

  const [tematicasDestacadas, setTematicasDestacadas] = useState([]);
  const [instrumentosPostulados, setInstrumentosPostulados] = useState([]);
  const [allInstrumentosForPdf, setAllInstrumentosForPdf] = useState([]);

  const [loading, setLoading] = useState(true);
  const [errorLocal, setErrorLocal] = useState(null);
  const { setError: setErrorGlobal } = useError();

  const estadisticasContentRef = useRef(null);
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

  // Paleta de azules
  const bluePalette = [
    "#2E5C8A",
    "#5D95C8",
    "#7CA3CB",
    "#3B82F6",
    "#1E3A5C",
    "#0F2A4A",
    "#4A7A9F",
  ];

  // ---------------------------
  // Helpers: normalización
  // ---------------------------
  const toArray = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean).map(String);

    if (typeof value === "string") {
      const s = value.trim();
      if (!s) return [];
      // si viene como "A, B; C | D"
      if (/[;,|]/.test(s)) {
        return s
          .split(/[;,|]/g)
          .map((x) => x.trim())
          .filter(Boolean);
      }
      return [s];
    }

    return [String(value)];
  };

  // IMPORTANTE:
  // El campo "Monto Proyecto MM$" en tu ejemplo parece venir como número MM$,
  // no pesos. Ej: 8.737 = 8.737 MM$ (o 8737 MM$ según origen).
  // Aquí lo tratamos como "MM$" tal cual (número).
  const toNumberMM = (value) => {
    if (value === null || value === undefined) return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;

    if (typeof value === "string") {
      const s = value.trim();
      if (!s) return 0;
      // intenta convertir "8,737" -> 8.737
      const normalized = s.replace(",", ".");
      const n = Number(normalized);
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  };

  const normalizeProyecto = (raw) => ({
    id: raw["N°"] ?? raw.id ?? crypto.randomUUID(),
    nombre: raw["Nombre Proyecto/Perfil Proyecto"] ?? "",
    tematica: raw["Temática"] ?? null,
    estatus: raw["Estatus"] ?? null,
    unidad: raw["Unidad Académica"] ?? null,
    unidadesPlus: toArray(raw["Unidad Académica ++"]),
    institucion: raw["Institucion Convocatoria"] ?? null,
    tipoConvocatoria: raw["Tipo Convocatoria"] ?? null,
    montoMM: toNumberMM(raw["Monto Proyecto MM$"]),
    lideres: toArray(raw["Académic@/s-Líder"]),
    partners: toArray(raw["Académic@/s-Partner"]),
    estudiantes: toArray(raw["Estudiantes"]),
    validar:
      String(raw["VALIDAR"] ?? "")
        .trim()
        .toUpperCase() === "TRUE",
  });

  // ---------------------------
  // Helpers: agregaciones
  // ---------------------------
  const groupCountBy = (items, getKey) => {
    const map = new Map();
    for (const it of items) {
      const key = getKey(it);
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  };

  const buildProyectosPorProfesor = (items) => {
    const map = new Map();

    for (const p of items) {
      const personas = [...(p.lideres ?? []), ...(p.partners ?? [])];

      // evita doble conteo dentro del mismo proyecto
      const unique = Array.from(new Set(personas.map((x) => String(x).trim())));

      for (const nombre of unique) {
        if (!nombre) continue;
        map.set(nombre, (map.get(nombre) ?? 0) + 1);
      }
    }

    return Array.from(map.entries())
      .map(([profesor, proyectos]) => ({ profesor, proyectos }))
      .sort((a, b) => b.proyectos - a.proyectos);
  };

  const buildProfesoresPorUnidad = (items) => {
    // profesores únicos por unidad, según líderes+partners
    const map = new Map();

    for (const p of items) {
      const unidad = p.unidad;
      if (!unidad) continue;

      const personas = new Set(
        [...(p.lideres ?? []), ...(p.partners ?? [])].map((x) =>
          String(x).trim()
        )
      );

      if (!map.has(unidad)) map.set(unidad, new Set());
      const set = map.get(unidad);

      for (const per of personas) {
        if (per) set.add(per);
      }
    }

    return Array.from(map.entries())
      .map(([UnidadAcademica, set]) => ({
        UnidadAcademica,
        NumeroDeProfesores: set.size,
      }))
      .sort((a, b) => b.NumeroDeProfesores - a.NumeroDeProfesores);
  };

  // Helper para formatear MM$ (ya viene en MM$)
  const formatMM = useCallback((montoMM) => {
    if (montoMM === null || montoMM === undefined || isNaN(montoMM))
      return "0 MM$";
    const numericMonto = Number(montoMM);
    if (!Number.isFinite(numericMonto)) return "0 MM$";

    return `${numericMonto.toLocaleString("es-CL", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    })} MM$`;
  }, []);

  // ---------------------------
  // Opciones de selects (dinámicas)
  // ---------------------------
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

  // ---------------------------
  // Fetch desde VITE_URL_BACKEND
  // ---------------------------
  const fetchDashboardData = async () => {
    setLoading(true);
    setErrorLocal(null);
    setErrorGlobal(null);

    try {
      if (!VITE_URL_BACKEND) {
        throw new Error("VITE_URL_BACKEND no está definido en el .env");
      }

      const res = await fetch(VITE_URL_BACKEND, { method: "GET" });
      if (!res.ok) throw new Error(`Backend HTTP ${res.status}`);

      const raw = await res.json();
      const list = Array.isArray(raw) ? raw : raw?.data;

      if (!Array.isArray(list)) {
        throw new Error("El backend no devolvió un arreglo ni { data: [] }");
      }

      const proyectos = list.map(normalizeProyecto).filter((p) => p.validar);

      setProyectosData(proyectos);

      // Construimos datasets base desde el mismo backend
      const proyectosPorProfesor = buildProyectosPorProfesor(proyectos);
      setProyectosPorProfesorData(proyectosPorProfesor);

      const profesoresPorUnidad = buildProfesoresPorUnidad(proyectos);
      setProfesoresPorUnidadData(profesoresPorUnidad);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setErrorLocal(
        err?.message || "Error al cargar los datos. Intente más tarde."
      );
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

  // ---------------------------
  // Lógica de filtrado + indicadores
  // ---------------------------
  useEffect(() => {
    // Filtrado base por selects
    let currentProyectos = proyectosData;

    if (selectedEscuela !== "Todas las Escuelas") {
      currentProyectos = currentProyectos.filter(
        (p) => p.unidad === selectedEscuela
      );
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

    // Gráficos dependientes del filtro
    setFilteredProyectosPorTematica(
      groupCountBy(currentProyectos, (p) => p.tematica)
    );

    setFilteredProyectosPorInstitucion(
      groupCountBy(currentProyectos, (p) => p.institucion)
    );

    const proyectosPorUnidadAgrupado = groupCountBy(
      currentProyectos,
      (p) => p.unidad
    );

    setFilteredProyectosPorUnidad(
      proyectosPorUnidadAgrupado
        .map((item) => ({ unidad: item.name, proyectos: item.value }))
        .sort((a, b) => b.proyectos - a.proyectos)
    );

    // Para "Proyectos por Profesor", lo reconstruimos desde currentProyectos
    setFilteredProyectosPorProfesor(
      buildProyectosPorProfesor(currentProyectos)
    );

    // Para "Profesores por Unidad", filtramos desde el dataset global,
    // pero si quieres exactitud con filtros tematica/estatus/etc,
    // reconstruimos desde currentProyectos:
    const profesoresUnidadFromFiltered = buildProfesoresPorUnidad(
      currentProyectos
    )
      .map((x) => ({
        unidad: x.UnidadAcademica,
        profesores: x.NumeroDeProfesores,
      }))
      .sort((a, b) => b.profesores - a.profesores);

    setFilteredProfesoresPorUnidad(profesoresUnidadFromFiltered);

    // Indicadores (estos pueden ser globales o filtrados; aquí los dejo globales
    // como lo tenías: projectsInDashboard = proyectosData)
    const projectsInDashboard = proyectosData;

    const totalMontoMM = projectsInDashboard.reduce(
      (sum, item) => sum + (item.montoMM || 0),
      0
    );

    const escuelasConProyectos = new Set(
      projectsInDashboard.map((item) => item.unidad).filter(Boolean)
    ).size;

    const academicosUnicosEnProyectos = new Set(
      projectsInDashboard.flatMap((p) => [
        ...(p.lideres ?? []),
        ...(p.partners ?? []),
      ])
    ).size;

    setIndicadoresPrincipales({
      proyectosEnCartera: projectsInDashboard.length,
      montoFormulado: formatMM(totalMontoMM),
      escuelasFIN: escuelasConProyectos,
      academicosInvolucrados: academicosUnicosEnProyectos,
    });

    const countsTematicas = groupCountBy(projectsInDashboard, (p) => p.tematica)
      .sort((a, b) => b.value - a.value)
      .map((item) => item.name)
      .slice(0, 6);
    setTematicasDestacadas(countsTematicas);

    // Instrumentos Postulados (por monto)
    const groupedInstruments = projectsInDashboard.reduce((acc, item) => {
      const key = `${item.institucion || "Sin instrumento"}`;
      if (!acc[key]) acc[key] = { name: key, montoMM: 0 };
      acc[key].montoMM += item.montoMM || 0;
      return acc;
    }, {});

    const processedInstrumentsForPdf = Object.values(groupedInstruments)
      .map((instrument) => ({
        ...instrument,
        montoFormatted: formatMM(instrument.montoMM),
      }))
      .sort((a, b) => b.montoMM - a.montoMM);

    const processedInstrumentsTop5 = processedInstrumentsForPdf.slice(0, 5);

    setAllInstrumentosForPdf(processedInstrumentsForPdf);
    setInstrumentosPostulados(processedInstrumentsTop5);
  }, [
    selectedEscuela,
    selectedTematica,
    selectedInstitucion,
    selectedEstatus,
    proyectosData,
    formatMM,
  ]);

  // ---------------------------
  // Chart.js Data & Options
  // ---------------------------
  const dataChartProyectosPorProfesor = {
    labels: filteredProyectosPorProfesor.map((d) => d.profesor),
    datasets: [
      {
        label: "Proyectos",
        data: filteredProyectosPorProfesor.map((d) => d.proyectos),
        backgroundColor: bluePalette[0],
      },
    ],
  };

  const optionsChartProyectosPorProfesor = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "x",
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || "";
            if (label) label += ": ";
            if (context.parsed.y !== null) label += context.parsed.y;
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
          font: { size: 11 },
        },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { precision: 0 },
        grid: { color: "rgba(0, 0, 0, 0.05)" },
      },
    },
  };

  const dataChartProyectosPorUnidad = {
    labels: filteredProyectosPorUnidad.map((d) => d.unidad),
    datasets: [
      {
        label: "Proyectos",
        data: filteredProyectosPorUnidad.map((d) => d.proyectos),
        backgroundColor: bluePalette[2],
      },
    ],
  };

  const optionsChartProyectosPorUnidad = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "x",
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || "";
            if (label) label += ": ";
            if (context.parsed.y !== null) label += context.parsed.y;
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
          font: { size: 11 },
        },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { precision: 0 },
        grid: { color: "rgba(0, 0, 0, 0.05)" },
      },
    },
  };

  const dataChartProfesoresPorUnidad = {
    labels: filteredProfesoresPorUnidad.map((d) => d.unidad),
    datasets: [
      {
        label: "Profesores",
        data: filteredProfesoresPorUnidad.map((d) => d.profesores),
        backgroundColor: bluePalette[0],
      },
    ],
  };

  const optionsChartProfesoresPorUnidad = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "x",
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || "";
            if (label) label += ": ";
            if (context.parsed.y !== null) label += context.parsed.y;
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
          font: { size: 11 },
        },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { precision: 0 },
        grid: { color: "rgba(0, 0, 0, 0.05)" },
      },
    },
  };

  const dataChartProyectosPorTematica = {
    labels: filteredProyectosPorTematica.map((d) => d.name),
    datasets: [
      {
        label: "Proyectos",
        data: filteredProyectosPorTematica.map((d) => d.value),
        backgroundColor: bluePalette[3],
      },
    ],
  };

  const optionsChartProyectosPorTematica = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y",
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || "";
            if (label) label += ": ";
            if (context.parsed.x !== null) label += context.parsed.x;
            return label;
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { precision: 0 },
        grid: { color: "rgba(0, 0, 0, 0.05)" },
      },
      y: {
        ticks: { autoSkip: true, font: { size: 12 } },
        grid: { display: false },
      },
    },
  };

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
    indexAxis: "y",
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || "";
            if (label) label += ": ";
            if (context.parsed.x !== null) label += context.parsed.x;
            return label;
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { precision: 0 },
        grid: { color: "rgba(0, 0, 0, 0.05)" },
      },
      y: {
        ticks: { autoSkip: true, font: { size: 12 } },
        grid: { display: false },
      },
    },
  };

  // ---------------------------
  // PDF
  // ---------------------------
  const generarPDF = async () => {
    setLoadingExportPDF(true);
    try {
      const doc = new jsPDF("p", "mm", "a4");
      const pdfWidth = doc.internal.pageSize.getWidth();
      const pdfHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pdfWidth - margin * 2;

      const input = estadisticasContentRef.current;
      if (!input) {
        setLoadingExportPDF(false);
        return;
      }

      const canvas = await html2canvas(input, {
        scale: 2,
        useCORS: true,
        logging: false,
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

      let yPos = margin + 30;

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
        {
          align: "center",
        }
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

      doc.addPage();
      let currentY = margin + 10;

      const addSectionTitle = (titleText) => {
        if (currentY + 20 > pdfHeight - margin) {
          doc.addPage();
          currentY = margin + 10;
        }
        doc.setFontSize(14);
        doc.setTextColor(46, 92, 138);
        doc.text(titleText, margin, currentY);
        doc.setTextColor(0);
        currentY += 10;
      };

      addSectionTitle("Datos: Proyectos por Profesor");
      if (filteredProyectosPorProfesor.length > 0) {
        autoTable(doc, {
          startY: currentY,
          head: [["Profesor", "Proyectos"]],
          body: filteredProyectosPorProfesor.map((x) => [
            x.profesor,
            x.proyectos,
          ]),
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
        currentY += 20;
      }

      addSectionTitle("Datos: Proyectos por Unidad Académica");
      if (filteredProyectosPorUnidad.length > 0) {
        autoTable(doc, {
          startY: currentY,
          head: [["Unidad Académica", "Proyectos"]],
          body: filteredProyectosPorUnidad.map((x) => [x.unidad, x.proyectos]),
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
        currentY += 20;
      }

      addSectionTitle("Datos: Profesores por Unidad Académica");
      if (filteredProfesoresPorUnidad.length > 0) {
        autoTable(doc, {
          startY: currentY,
          head: [["Unidad Académica", "Profesores"]],
          body: filteredProfesoresPorUnidad.map((x) => [
            x.unidad,
            x.profesores,
          ]),
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
        currentY += 20;
      }

      addSectionTitle("Datos: Proyectos por Temática");
      if (filteredProyectosPorTematica.length > 0) {
        autoTable(doc, {
          startY: currentY,
          head: [["Temática", "Proyectos"]],
          body: filteredProyectosPorTematica.map((x) => [x.name, x.value]),
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
        currentY += 20;
      }

      addSectionTitle("Datos: Proyectos por Tipo de Fondo");
      if (filteredProyectosPorInstitucion.length > 0) {
        autoTable(doc, {
          startY: currentY,
          head: [["Tipo de Fondo", "Proyectos"]],
          body: filteredProyectosPorInstitucion.map((x) => [x.name, x.value]),
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
        currentY += 20;
      }

      addSectionTitle("Datos: Instrumentos Postulados (Todos)");
      if (allInstrumentosForPdf.length > 0) {
        autoTable(doc, {
          startY: currentY,
          head: [["Instrumento", "Monto (MM$)"]],
          body: allInstrumentosForPdf.map((x) => [x.name, x.montoFormatted]),
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
        currentY += 20;
      }

      const filename = `estadisticas_dashboard_${dateString}.pdf`;
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
          <Spinner size={64} className="text-[#2E5C8A] mb-4" />
          <p className="text-lg text-gray-600">
            Cargando datos del dashboard... Por favor, espere.
          </p>
        </div>
      ) : errorLocal ? (
        <div className="max-w-7xl mx-auto py-8">
          <Alert variant="destructive" className="bg-red-50 text-red-700">
            <XCircle className="h-5 w-5 mr-4" />
            <AlertTitle>Error al cargar las estadísticas</AlertTitle>
            <AlertDescription>{errorLocal}</AlertDescription>
          </Alert>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto space-y-4">
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

          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
            {/* Columna 1 */}
            <div className="space-y-8">
              <div className="grid grid-cols-1 gap-4">
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

                <div className="bg-[#e1edfd] rounded-lg p-4 shadow-sm border border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Empresas Partners
                    </p>
                    <p className="text-2xl font-bold text-gray-900">12</p>
                  </div>
                  <Building2 className="w-6 h-6 text-gray-700 opacity-70" />
                </div>

                <div className="bg-[#e1edfd]  rounded-lg p-4 shadow-sm border border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Universidades Partners
                    </p>
                    <p className="text-2xl font-bold text-gray-900">5</p>
                  </div>
                  <University className="w-6 h-6 text-gray-700 opacity-70" />
                </div>
              </div>

              <div className="bg-[#e1edfd] items-center rounded-xl p-6 text-gray-900 shadow-lg border border-gray-100">
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

              <div className="bg-[#e1edfd] rounded-xl p-6 text-gray-900 shadow-lg border border-gray-100">
                <h3 className="text-lg text-center font-semibold">
                  Instrumentos Postulados
                </h3>
                <h3 className="text-sm text-gray-500 text-center font-semibold mb-4">
                  Top 5 (por Monto)
                </h3>
                <div className="flex flex-col">
                  {instrumentosPostulados.map((instrumento, index) => (
                    <div key={index} className="flex items-center mb-2 gap-4">
                      {renderInstitucionLogo(instrumento.name || "")}
                      <span>{instrumento.name || "Sin información"}</span>
                      <span className="font-semibold">
                        {instrumento.montoFormatted}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Columna 2 */}
            <div className="space-y-8">
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

              <div className="bg-white rounded-lg shadow-lg p-6">
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
            </div>

            {/* Columna 3 */}
            <div className="lg:col-span-1 space-y-8">
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
          </div>
        </div>
      )}
    </div>
  );
}
