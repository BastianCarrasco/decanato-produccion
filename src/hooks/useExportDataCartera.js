import { useState } from "react";
import { useProyectos } from "@/contexts/ProyectosContext";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import LatoRegular from "../assets/fonts/Lato-Regular.ttf";
import LatoBold from "../assets/fonts/Lato-Bold.ttf";

function getFechaArchivo() {
  const now = new Date();
  return now
    .toLocaleDateString("es-CL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .replace(/\//g, "-");
}

export function useExportData() {
  const { proyectosContexto } = useProyectos();
  const [loadingExportPDF, setLoadingExportPDF] = useState(false);
  const [loadingExportExcel, setLoadingExportExcel] = useState(false);

  const columnas = [
    { key: "nombre", label: "Nombre del Proyecto" },
    { key: "unidad", label: "Unidad" },
    { key: "tematica", label: "Temática" },
    { key: "estatus", label: "Estatus" },
    { key: "apoyo", label: "Tipo de Apoyo" },
    { key: "detalle_apoyo", label: "Detalle Apoyo" },
    { key: "monto", label: "Monto" },
    { key: "fecha_postulacion", label: "Fecha Postulación" },
    { key: "institucion", label: "Institución" },
    { key: "nombre_convo", label: "Convocatoria" },
    { key: "comentarios", label: "Comentarios" },
    { key: "academicos", label: "Académicos" },
    { key: "estudiantes", label: "Estudiantes" },
  ];

  // Placeholder para la imagen del logo en Base64.
  // DEBES REEMPLAZAR ESTO CON TU IMAGEN EN BASE64.
  const LOGO_BASE64 =
    "data:image/png;base64,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";

  // Función para dibujar el encabezado en cada página
  const drawHeader = (doc, fecha, pageNumber) => {
    const headerHeight = 70; // Altura del encabezado
    const headerColor = "#2E5C8A"; // Color del encabezado

    // Fondo del encabezado
    doc.setFillColor(headerColor);
    doc.rect(0, 0, doc.internal.pageSize.width, headerHeight, "F");

    const logoWidth = 150;
    const logoHeight = 50;
    const pageWidth = doc.internal.pageSize.getWidth();
    const xCentered = (pageWidth - logoWidth) / 2;

    doc.addImage(
      LOGO_BASE64,
      "PNG",
      xCentered, // Centrado horizontal
      10, // 10pt desde el borde superior
      logoWidth, // Ancho del logo
      logoHeight // Alto del logo
    );

    // Número de página (opcional, pero útil)
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(
      `Página ${pageNumber}`,
      doc.internal.pageSize.width - 40,
      doc.internal.pageSize.height - 20 // Abajo a la derecha
    );

    // Resetear colores y fuentes para el contenido principal
    doc.setTextColor(0, 0, 0); // Volver a color negro para el contenido
    doc.setFontSize(12);
  };

  const drawFooter = (doc, pageNumber) => {
    doc.setFontSize(8);
    doc.setTextColor(150);
    const text = `Página ${pageNumber}`;
    const textWidth = doc.getTextWidth(text);
    doc.text(
      text,
      doc.internal.pageSize.width - textWidth - 40, // alineado a la derecha con margen
      doc.internal.pageSize.height - 30 // cerca del borde inferior
    );
  };

  // Exportar a PDF como lista/enunciado
  const generarPDF = async () => {
    setLoadingExportPDF(true);
    try {
      const fecha = getFechaArchivo();
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "A4",
      });

      doc.addFont(LatoRegular, "Lato", "normal");
      doc.addFont(LatoBold, "Lato", "bold");
      doc.setFont("Lato", "normal");

      const margin = 40; // Margen izquierdo y derecho
      const contentWidth = doc.internal.pageSize.width - 2 * margin; // Ancho disponible para el texto
      const lineHeight = 14; // Altura de línea para el texto normal
      const headerHeight = 70; // Altura que ocupa nuestro encabezado

      let y = headerHeight + margin; // Posición Y inicial después del encabezado y un margen

      const proyectos = proyectosContexto ?? [];

      // Dibuja el encabezado en la primera página
      drawHeader(doc, 1);

      // --- Contenido adicional para la primera página (título y fecha) ---
      doc.setFont("Lato", "bold");
      doc.setFontSize(18);
      doc.text(
        "Cartera de Proyectos",
        doc.internal.pageSize.width / 2,
        y + 255, // Un poco más abajo del header
        { align: "center" }
      );
      y += 18 + 10; // Espacio para el título\

      doc.setFont("Lato", "normal");
      doc.setFontSize(10);
      doc.text(
        `Generado el: ${fecha}`,
        doc.internal.pageSize.width / 2,
        y + 250, // Un poco más abajo del título
        { align: "center" }
      );
      y += 10 + 20;

      if (proyectos.length > 0) {
        drawFooter(doc, doc.internal.getNumberOfPages());
        doc.addPage();
        drawHeader(doc, fecha, doc.internal.getNumberOfPages());
        y = headerHeight + margin;
      }

      proyectos.forEach((p, idx) => {
        // Calcular la altura estimada para el proyecto actual
        let currentProjectHeight = 0;
        columnas.forEach((col) => {
          let valor = "-";
          if (col.key === "monto") {
            valor =
              p.monto !== null && p.monto !== undefined
                ? `$${p.monto.toLocaleString("es-CL")}`
                : "-";
          } else if (col.key === "fecha_postulacion") {
            valor = p.fecha_postulacion
              ? new Date(p.fecha_postulacion).toLocaleDateString("es-CL")
              : "-";
          } else if (col.key === "academicos") {
            valor =
              Array.isArray(p.academicos) && p.academicos.length > 0
                ? p.academicos.map((a) => a.nombre_completo).join(", ")
                : "Sin académicos involucrados"; // <--- CAMBIO AQUÍ para PDF
          } else if (col.key === "estudiantes") {
            // <--- NUEVA LÓGICA PARA ESTUDIANTES EN PDF
            valor =
              Array.isArray(p.estudiantes) && p.estudiantes.length > 0
                ? p.estudiantes
                    .map((e) => `${e.nombre} ${e.a_paterno || ""}`.trim())
                    .join(", ")
                : "Sin estudiantes involucrados";
          } else {
            valor = p[col.key] ?? "-";
          }

          const tituloTexto = `${col.label}:`;
          const valorTexto = String(valor);
          const tituloWidth =
            doc.getStringUnitWidth(tituloTexto) * doc.getFontSize();
          const availableWidthForValue = contentWidth - tituloWidth - 10;

          const splitValor = doc.splitTextToSize(
            valorTexto,
            availableWidthForValue
          );
          currentProjectHeight += splitValor.length * lineHeight;
        });
        currentProjectHeight += 4 + lineHeight; // Para la línea divisoria y el margen después

        // Comprobación de salto de página antes de dibujar el proyecto
        // (Esto solo se activará para proyectos posteriores a la primera página si no caben)
        if (y + currentProjectHeight > doc.internal.pageSize.height - margin) {
          drawFooter(doc, doc.internal.getNumberOfPages());
          doc.addPage();
          drawHeader(doc, doc.internal.getNumberOfPages()); // Dibuja header en la nueva página
          y = headerHeight + margin;
        }

        // --- Dibujar los detalles del proyecto ---
        doc.setFont("Lato", "bold");
        doc.setFontSize(14);
        doc.text(`Proyecto ${idx + 1}`, doc.internal.pageSize.width / 2, y, {
          align: "center",
        });
        y += lineHeight + 20;
        columnas.forEach((col) => {
          let valor = "-";
          if (col.key === "monto") {
            valor =
              p.monto !== null && p.monto !== undefined
                ? `$${p.monto.toLocaleString("es-CL")}`
                : "-";
          } else if (col.key === "fecha_postulacion") {
            valor = p.fecha_postulacion
              ? new Date(p.fecha_postulacion).toLocaleDateString("es-CL")
              : "-";
          } else if (col.key === "academicos") {
            valor =
              Array.isArray(p.academicos) && p.academicos.length > 0
                ? p.academicos.map((a) => a.nombre_completo).join(", ")
                : "Sin académicos involucrados"; // <--- CAMBIO AQUÍ para PDF
          } else if (col.key === "estudiantes") {
            // <--- NUEVA LÓGICA PARA ESTUDIANTES EN PDF
            valor =
              Array.isArray(p.estudiantes) && p.estudiantes.length > 0
                ? p.estudiantes
                    .map((e) => `${e.nombre} ${e.a_paterno || ""}`.trim())
                    .join(", ")
                : "Sin estudiantes involucrados";
          } else {
            valor = p[col.key] ?? "-";
          }

          const tituloTexto = `${col.label}:`;
          const valorTexto = String(valor);
          const tituloWidth =
            doc.getStringUnitWidth(tituloTexto) * doc.getFontSize();
          const availableWidthForValue = contentWidth - tituloWidth - 10;

          const splitValor = doc.splitTextToSize(
            valorTexto,
            availableWidthForValue
          );

          doc.setFont("Lato", "bold");
          doc.setFontSize(12);
          doc.text(tituloTexto, margin, y);

          doc.setFont("Lato", "normal");
          doc.setFontSize(12);
          doc.text(splitValor, margin + tituloWidth + 10, y);

          y += splitValor.length * lineHeight + 2;
        });

        // Línea divisoria entre proyectos
        y += 4;
        doc.setDrawColor(200);
        doc.line(margin, y, doc.internal.pageSize.width - margin, y);
        const espacioDespuesSeparador = 10;
        y += lineHeight + espacioDespuesSeparador;
      });

      drawFooter(doc, doc.internal.getNumberOfPages());
      doc.save(`proyectos_${fecha}.pdf`);
    } catch (e) {
      console.error("Error al exportar PDF:", e);
    } finally {
      setLoadingExportPDF(false);
    }
  };

  // Exportar a Excel usando xlsx (como antes)
  const generarExcel = async () => {
    setLoadingExportExcel(true);
    try {
      const data = (proyectosContexto ?? []).map((p) => {
        const row = {};
        columnas.forEach((col) => {
          if (col.key === "monto") {
            row[col.label] =
              p.monto !== null && p.monto !== undefined
                ? `$${p.monto.toLocaleString("es-CL")}`
                : "-";
          } else if (col.key === "fecha_postulacion") {
            row[col.label] = p.fecha_postulacion
              ? new Date(p.fecha_postulacion).toLocaleDateString("es-CL")
              : "-";
          } else if (col.key === "academicos") {
            row[col.label] =
              Array.isArray(p.academicos) && p.academicos.length > 0
                ? p.academicos.map((a) => a.nombre_completo).join(", ")
                : "Sin académicos involucrados"; // <--- CAMBIO AQUÍ para Excel
          } else if (col.key === "estudiantes") {
            // <--- NUEVA LÓGICA PARA ESTUDIANTES EN EXCEL
            row[col.label] =
              Array.isArray(p.estudiantes) && p.estudiantes.length > 0
                ? p.estudiantes
                    .map((e) => `${e.nombre} ${e.a_paterno || ""}`.trim())
                    .join(", ")
                : "Sin estudiantes involucrados";
          } else {
            row[col.label] = p[col.key] ?? "-";
          }
        });
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Proyectos");

      const fecha = getFechaArchivo();
      XLSX.writeFile(wb, `proyectos_${fecha}.xlsx`);
    } catch (e) {
      console.error("Error al exportar Excel:", e);
    } finally {
      setLoadingExportExcel(false);
    }
  };

  return {
    loadingExportPDF,
    loadingExportExcel,
    generarPDF,
    generarExcel,
  };
}
