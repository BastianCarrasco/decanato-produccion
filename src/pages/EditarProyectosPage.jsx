import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Edit,
  Trash2,
  X,
  Check,
  Search,
  RotateCcw,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";

// Importar componentes de Shadcn UI para el diálogo de alerta
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Importar servicios de la API
import proyectosService from "../api/proyectos";
import funcionesService from "../api/funciones.js";
import unidadesAcademicasService from "../api/unidadesacademicas";
import estatusService from "../api/estatus";
import institucionesConvocatoriaService from "../api/institucionconvocatoria";
import apoyosService from "../api/apoyos";
import tematicasService from "../api/tematicas";
import tipoConvocatoriaService from "../api/tipoconvocatoria";

// Función para formatear el monto a CLP (Peso Chileno)
const formatCLP = (value) => {
  if (value === null || value === undefined || isNaN(value)) {
    return "-";
  }
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Componente de celda editable genérico
const EditableCell = ({
  getValue,
  row,
  column,
  table,
  type = "text",
  options = [],
  isTruncatable = false, // Nueva prop para controlar el truncamiento y tooltip
  maxWidth = "max-w-[200px]", // Nueva prop para controlar el ancho máximo
}) => {
  const initialValue = getValue();
  const [value, setValue] = useState(initialValue);
  const [isEditing, setIsEditing] = useState(false);

  // Sincronizar el valor interno con el valor de la tabla
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const onBlur = () => {
    setIsEditing(false);
    // Llamar a la función de actualización pasada por meta
    // `value` aquí SIEMPRE es el monto completo, no el dividido por millón
    table.options.meta?.updateData(row.original.id_proyecto, column.id, value);
  };

  const onSelectChange = (newValue) => {
    setValue(newValue);
    table.options.meta?.updateData(
      row.original.id_proyecto,
      column.id,
      newValue
    );
    setIsEditing(false); // Cerrar la edición después de seleccionar
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onBlur();
    } else if (e.key === "Escape") {
      setValue(initialValue); // Revertir al valor original
      setIsEditing(false);
    }
  };

  const formattedDisplayValue = useMemo(() => {
    if (
      initialValue === null ||
      initialValue === "" ||
      initialValue === undefined
    ) {
      return "-";
    }

    if (column.id === "monto") {
      // Para la VISUALIZACIÓN, dividir por 1,000,000
      const montoEnMillones = Number(initialValue) / 1_000_000;
      // Formatear como número, puedes ajustar los decimales si es necesario
      if (isNaN(montoEnMillones)) return "-";
      return `$${montoEnMillones.toLocaleString("es-CL", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1, // Puedes ajustar los decimales aquí
      })} `;
    }

    if (column.id === "fecha_postulacion" && initialValue) {
      // Formatear la fecha para mostrar (DD-MM-YYYY)
      const date = new Date(initialValue);
      return date.toLocaleDateString("es-CL", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    }

    // Para select, buscar el label correspondiente al valor
    if (type === "select") {
      const selectedOption = options.find(
        (option) => String(option.value) === String(initialValue)
      );
      return selectedOption ? selectedOption.label : "-";
    }

    return initialValue;
  }, [initialValue, column.id, type, options]);

  if (isEditing) {
    switch (type) {
      case "select":
        return (
          <Select
            value={String(value)}
            onValueChange={onSelectChange}
            autoFocus
          >
            <SelectTrigger className="w-full h-8 text-sm px-2">
              <SelectValue placeholder="Seleccione..." />
            </SelectTrigger>
            <SelectContent>
              {options.map((option, index) => (
                <SelectItem
                  key={option.value || index}
                  value={String(option.value)}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "date":
        return (
          <Input
            type="date"
            // Formatear la fecha a 'YYYY-MM-DD' para el input type="date"
            value={value ? new Date(value).toISOString().split("T")[0] : ""}
            onChange={(e) => setValue(e.target.value)}
            onBlur={onBlur}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full h-8 text-sm px-2"
          />
        );
      case "number":
        return (
          <Input
            type="number"
            value={value} // Aquí se muestra el valor COMPLETO para la edición
            onChange={(e) => setValue(e.target.value)}
            onBlur={onBlur}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full h-8 text-sm px-2"
          />
        );
      case "textarea":
        return (
          <Textarea
            value={value || ""}
            onChange={(e) => setValue(e.target.value)}
            onBlur={onBlur}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full min-h-[40px] text-sm px-2 py-1"
          />
        );
      default:
        return (
          <Input
            type="text"
            value={value || ""}
            onChange={(e) => setValue(e.target.value)}
            onBlur={onBlur}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full h-8 text-sm px-2"
          />
        );
    }
  }

  // Renderizado del valor cuando NO está editando
  // Aplicar truncamiento y tooltip si isTruncatable es true
  if (isTruncatable) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              // Aplicamos las clases para truncar y el ancho máximo
              className={`truncate block cursor-pointer ${maxWidth}`}
              onClick={() => setIsEditing(true)}
            >
              {formattedDisplayValue}
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-sm">
            {/* El tooltip siempre muestra el valor COMPLETO */}
            {column.id === "monto"
              ? formatCLP(initialValue)
              : formattedDisplayValue}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Comportamiento por defecto (sin truncamiento ni tooltip, como antes para comentarios)
  return (
    <span onClick={() => setIsEditing(true)} className="cursor-pointer">
      {formattedDisplayValue}
    </span>
  );
};

export default function EditarProyectosPage() {
  const navigate = useNavigate();

  // --- Estados de la aplicación ---
  const [projectsData, setProjectsData] = useState([]);
  const [unidadesData, setUnidadesData] = useState([]);
  const [estatusData, setEstatusData] = useState([]);
  const [institucionesData, setInstitucionesData] = useState([]);
  const [apoyosData, setApoyosData] = useState([]);
  const [tematicasData, setTematicasData] = useState([]);
  const [tiposConvocatoriaData, setTiposConvocatoriaData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- Estados para el AlertDialog de eliminación ---
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null); // Almacena el objeto completo del proyecto a eliminar

  // --- Estados para filtros y paginación ---
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  // Función para obtener todos los datos necesarios
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        proyectos,
        academicos, // Mantenerlo para el mapeo, aunque no se use en un estado directo de la tabla
        unidades,
        estatus,
        instituciones,
        apoyos,
        tematicas,
        tiposConvocatoria,
      ] = await Promise.all([
        proyectosService.getAllProyectosCrudo(),
        funcionesService.getAcademicosPorProyecto(),
        unidadesAcademicasService.getAllUnidadesAcademicas(),
        estatusService.getAllEstatus(),
        institucionesConvocatoriaService.getAllInstitucionesConvocatoria(),
        apoyosService.getAllApoyos(),
        tematicasService.getAllTematicas(),
        tipoConvocatoriaService.getAllTiposConvocatoria(),
      ]);

      // Mapear los datos de proyectos para incluir nombres en lugar de IDs
      const mappedProjects = proyectos.map((p) => {
        const unidadEncontrada = unidades.find((u) => u.id_unidad === p.unidad);
        const tematicaEncontrada = tematicas.find(
          (t) => t.id_tematica === p.id_tematica
        );
        const estatusEncontrado = estatus.find(
          (e) => e.id_estatus === p.id_estatus
        );
        const tipoConvocatoriaEncontrada = tiposConvocatoria.find(
          (tc) => tc.id === p.tipo_convocatoria
        );
        const instConvocatoriaEncontrada = instituciones.find(
          (ic) => ic.id === p.inst_conv
        );
        const apoyoEncontrado = apoyos.find((a) => a.id_apoyo === p.apoyo);

        // Obtener académicos para este proyecto
        const academicosDelProyecto = academicos.find(
          (ap) => ap.id_proyecto === p.id_proyecto
        );
        const nombresAcademicos = academicosDelProyecto
          ? academicosDelProyecto.profesores
              .map((prof) => prof.nombre_completo)
              .join(", ")
          : "";

        return {
          ...p,
          unidad_nombre: unidadEncontrada
            ? unidadEncontrada.nombre
            : "Desconocido",
          tematica_nombre: tematicaEncontrada
            ? tematicaEncontrada.nombre
            : "Desconocido",
          estatus_nombre: estatusEncontrado
            ? estatusEncontrado.tipo
            : "Desconocido",
          tipo_convocatoria_nombre: tipoConvocatoriaEncontrada
            ? tipoConvocatoriaEncontrada.nombre
            : "Desconocido",
          inst_conv_nombre: instConvocatoriaEncontrada
            ? instConvocatoriaEncontrada.nombre
            : "Desconocido",
          apoyo_nombre: apoyoEncontrado
            ? apoyoEncontrado.nombre
            : "Desconocido",
          academicos: nombresAcademicos,
        };
      });

      setProjectsData(mappedProjects);
      // console.log("Projects Data después del mapeo:", mappedProjects);
      // setAcademicosData(academicos); // Ya no se necesita mantener este estado directamente
      setUnidadesData(unidades);
      setEstatusData(estatus);
      setInstitucionesData(instituciones);
      setApoyosData(apoyos);
      setTematicasData(tematicas);
      setTiposConvocatoriaData(tiposConvocatoria);
    } catch (err) {
      console.error("Error al cargar datos:", err);
      setError(
        "No se pudieron cargar los datos. Inténtalo de nuevo más tarde."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Función para manejar la eliminación después de la confirmación
  const handleDeleteConfirm = useCallback(async () => {
    if (!projectToDelete) return;

    try {
      await proyectosService.eliminarProyecto(projectToDelete.id_proyecto);

      // Eliminar de la UI
      setProjectsData((prev) =>
        prev.filter((p) => p.id_proyecto !== projectToDelete.id_proyecto)
      );
    } catch (err) {
      console.error("Error al eliminar el proyecto:", err);
      alert("Error al eliminar el proyecto. Inténtalo de nuevo.");
    } finally {
      setIsDeleteDialogOpen(false); // Cerrar el diálogo
      setProjectToDelete(null); // Limpiar el proyecto a eliminar
    }
  }, [projectToDelete]);

  // Manejo de la actualización de datos en la tabla (persistencia a la API)
  const updateProjectData = useCallback(
    async (projectId, columnId, value) => {
      // Encuentra el proyecto original por su ID
      const originalProject = projectsData.find(
        (p) => p.id_proyecto === projectId
      );

      if (!originalProject) {
        console.warn(`Proyecto con ID ${projectId} no encontrado.`);
        return;
      }

      // Prepara los datos a enviar a la API
      let updatedValue = value;
      let fieldToUpdate = columnId;
      let payload = { ...originalProject }; // Copia el proyecto original

      // Ajustes específicos según la columna
      switch (columnId) {
        case "monto":
          updatedValue = Number(value); // Asegúrate de que el monto sea un número
          if (isNaN(updatedValue)) updatedValue = 0; // O manejar el error
          break;
        case "fecha_postulacion":
          // La API espera un formato ISO 8601 (con o sin 'Z' al final, pero consistentemente)
          // Si el input es un string 'YYYY-MM-DD', conviértelo a Date y luego a ISO string
          if (value) {
            const date = new Date(value);
            updatedValue = date.toISOString(); // Ejemplo: "2024-09-18T00:00:00.000Z"
          } else {
            updatedValue = null;
          }
          break;
        case "unidad":
          fieldToUpdate = "unidad"; // La API espera 'unidad'
          break;
        case "id_tematica":
          fieldToUpdate = "id_tematica"; // La API espera 'id_tematica'
          break;
        case "estatus":
          fieldToUpdate = "id_estatus"; // La API espera 'id_estatus'
          break;
        case "tipo_convocatoria":
          fieldToUpdate = "tipo_convocatoria"; // La API espera 'tipo_convocatoria'
          break;
        case "inst_conv":
          fieldToUpdate = "inst_conv"; // La API espera 'inst_conv'
          break;
        case "apoyo":
          fieldToUpdate = "apoyo"; // La API espera 'apoyo'
          break;
        case "academicos":
          // Los académicos se manejan por separado o no se actualizan aquí
          console.warn(
            "La columna de académicos no es directamente editable para persistencia."
          );
          return;
        default:
          // Para otras columnas, el nombre de la columna en la tabla es el mismo que en la API
          break;
      }

      // Actualizar el payload con el nuevo valor
      payload = { ...payload, [fieldToUpdate]: updatedValue };

      // Eliminar las propiedades que no son parte del body esperado por la API de actualización
      delete payload.unidad_nombre;
      delete payload.tematica_nombre;
      delete payload.estatus_nombre;
      delete payload.tipo_convocatoria_nombre;
      delete payload.inst_conv_nombre;
      delete payload.apoyo_nombre;
      delete payload.academicos; // No enviar esto al endpoint de proyectos

      // Asegurarse de que id_kth siempre sea null, como lo pide tu API
      payload.id_kth = null;

      try {
        await proyectosService.actualizarProyecto(projectId, payload);

        // Actualizar el estado local solo si la API tuvo éxito
        setProjectsData((old) =>
          old.map((row) => {
            if (row.id_proyecto === projectId) {
              const updatedRow = { ...row, [columnId]: value };
              // Re-aplicar los nombres para que la UI se actualice correctamente
              if (columnId === "unidad") {
                const unidad = unidadesData.find((u) => u.id_unidad === value);
                updatedRow.unidad_nombre = unidad
                  ? unidad.nombre
                  : "Desconocido";
              } else if (columnId === "id_tematica") {
                const tematica = tematicasData.find(
                  (t) => t.id_tematica === value
                );
                updatedRow.tematica_nombre = tematica
                  ? tematica.nombre
                  : "Desconocido";
              } else if (columnId === "estatus") {
                const estatus = estatusData.find((e) => e.id_estatus === value);
                updatedRow.estatus_nombre = estatus
                  ? estatus.tipo
                  : "Desconocido";
              } else if (columnId === "tipo_convocatoria") {
                const tipoConvocatoria = tiposConvocatoriaData.find(
                  (tc) => tc.id === value
                );
                updatedRow.tipo_convocatoria_nombre = tipoConvocatoria
                  ? tipoConvocatoria.nombre
                  : "Desconocido";
              } else if (columnId === "inst_conv") {
                const instConvocatoria = institucionesData.find(
                  (ic) => ic.id === value
                );
                updatedRow.inst_conv_nombre = instConvocatoria
                  ? instConvocatoria.nombre
                  : "Desconocido";
              } else if (columnId === "apoyo") {
                const apoyo = apoyosData.find((a) => a.id_apoyo === value);
                updatedRow.apoyo_nombre = apoyo ? apoyo.nombre : "Desconocido";
              }
              return updatedRow;
            }
            return row;
          })
        );
      } catch (err) {
        console.error(
          `Error al actualizar el proyecto ${projectId} en la columna ${columnId}:`,
          err
        );
        alert(
          `Error al guardar el cambio para el proyecto ${originalProject.nombre}.`
        );
        // Revertir el estado local al valor original si falla la API
        setProjectsData((old) =>
          old.map((row) =>
            row.id_proyecto === projectId ? originalProject : row
          )
        );
      }
    },
    [
      projectsData,
      unidadesData,
      tematicasData,
      estatusData,
      institucionesData,
      apoyosData,
      tiposConvocatoriaData,
    ]
  );

  // Helper para crear celdas truncables con un maxWidth por defecto
  const TruncatableCell = (defaultMaxWidth) => (props) =>
    <EditableCell {...props} isTruncatable={true} maxWidth={defaultMaxWidth} />;

  // Helper para crear celdas de selección truncables con opciones y maxWidth
  const TruncatableSelectCell =
    (optionsData, valueKey, labelKey, defaultMaxWidth) => (props) =>
      (
        <EditableCell
          {...props}
          type="select"
          options={optionsData.map((item) => ({
            value: item[valueKey],
            label: item[labelKey],
          }))}
          isTruncatable={true}
          maxWidth={defaultMaxWidth}
        />
      );

  // Custom filter function para rangos de monto
  const filterMontoRange = useCallback((row, columnId, filterValues) => {
    // filterValues es un array [min, max] o null/undefined
    const [min, max] = filterValues || [null, null];
    const monto = Number(row.getValue(columnId)); // Obtener el monto de la fila

    if (isNaN(monto)) return false; // Si el monto no es un número, no pasa el filtro

    // Si no hay min ni max, pasa el filtro
    if (min === null && max === null) {
      return true;
    }

    // Si hay min, verificar que el monto sea mayor o igual
    const passesMin = min !== null ? monto >= min : true;

    // Si hay max, verificar que el monto sea menor o igual
    const passesMax = max !== null ? monto <= max : true;

    return passesMin && passesMax;
  }, []);

  // --- Definición de Columnas para TanStack Table ---
  const columns = useMemo(
    () => [
      // Columna de acciones al principio
      {
        id: "actions", // Importante que tenga un ID único
        header: "", // Encabezado de la columna (vacío, solo el icono)
        size: 50, // Tamaño de la columna para que quepa el icono cómodamente
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            {" "}
            {/* Centrar el icono */}
            <Button
              size="sm"
              variant="ghost"
              className="text-red-600 hover:bg-red-600/10 p-1 h-auto cursor-pointer" // Ajusta padding y altura
              onClick={(e) => {
                e.stopPropagation(); // Evita que la fila se haga editable
                setProjectToDelete(row.original); // Almacenar el proyecto a eliminar
                setIsDeleteDialogOpen(true); // Abrir el diálogo
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ),
      },
      {
        accessorKey: "nombre",
        header: "Nombre Proyecto",
        cell: TruncatableCell("max-w-[280px]"),
        size: 300,
      },
      {
        accessorKey: "monto",
        header: "Monto Proyecto MM$",
        cell: EditableCell,
        meta: { type: "number" }, // Indicar que es un número
        size: 150,
      },
      {
        accessorKey: "fecha_postulacion",
        header: "Fecha Postulación",
        cell: EditableCell,
        meta: { type: "date" }, // Indicar que es una fecha
        size: 150,
      },
      {
        accessorKey: "comentarios",
        header: "Comentarios",
        cell: (props) => (
          <EditableCell
            {...props}
            type="textarea"
            isTruncatable={true}
            maxWidth="max-w-[180px]"
          />
        ),
        size: 200,
      },
      {
        accessorKey: "unidad",
        header: "Unidad Académica",
        cell: TruncatableSelectCell(
          unidadesData,
          "id_unidad",
          "nombre",
          "max-w-[180px]"
        ),
        size: 200,
        filterFn: (row, columnId, filterValue) => {
          // El valor en la fila es el ID numérico (ej. 2)
          // El filterValue es el ID numérico que viene del Select (ej. 2)
          return row.getValue(columnId) === filterValue;
        },
      },
      {
        accessorKey: "id_tematica",
        header: "Temática",
        cell: TruncatableSelectCell(
          tematicasData,
          "id_tematica",
          "nombre",
          "max-w-[130px]"
        ),
        size: 150,
        filterFn: (row, columnId, filterValue) => {
          return row.getValue(columnId) === filterValue;
        },
      },
      {
        accessorKey: "id_estatus",
        header: "Estatus",
        cell: TruncatableSelectCell(
          estatusData,
          "id_estatus",
          "tipo",
          "max-w-[100px]"
        ),
        size: 120,
        filterFn: (row, columnId, filterValue) => {
          return row.getValue(columnId) === filterValue;
        },
      },
      {
        accessorKey: "convocatoria",
        header: "Nombre Convocatoria a la que se postuló",
        cell: TruncatableCell("max-w-[230px]"),
        size: 250,
      },
      {
        accessorKey: "tipo_convocatoria",
        header: "Tipo Convocatoria",
        cell: TruncatableSelectCell(
          tiposConvocatoriaData,
          "id",
          "nombre",
          "max-w-[130px]"
        ),
        size: 150,
        filterFn: (row, columnId, filterValue) => {
          // Asumo que 'id' en tipoConvocatoriaData es el ID numérico
          return row.getValue(columnId) === filterValue;
        },
      },
      {
        accessorKey: "inst_conv",
        header: "Institución Convocatoria",
        cell: TruncatableSelectCell(
          institucionesData,
          "id",
          "nombre",
          "max-w-[180px]"
        ),
        size: 200,
        filterFn: (row, columnId, filterValue) => {
          // Asumo que 'id' en institucionesData es el ID numérico
          return row.getValue(columnId) === filterValue;
        },
      },
      {
        accessorKey: "detalle_apoyo",
        header: "Detalle Apoyo",
        cell: TruncatableCell("max-w-[180px]"),
        size: 200,
      },
      {
        accessorKey: "apoyo",
        header: "Tipo Apoyo",
        cell: TruncatableSelectCell(
          apoyosData,
          "id_apoyo",
          "nombre",
          "max-w-[100px]"
        ),
        size: 120,
        filterFn: (row, columnId, filterValue) => {
          // Asumo que 'id_apoyo' en apoyosData es el ID numérico
          return row.getValue(columnId) === filterValue;
        },
      },
      {
        accessorKey: "academicos",
        header: "Académicos",
        cell: TruncatableCell("max-w-[230px]"),
        size: 250,
      },
    ],
    [
      unidadesData,
      tematicasData,
      estatusData,
      tiposConvocatoriaData,
      institucionesData,
      apoyosData,
      filterMontoRange, // Asegúrate de añadir filterMontoRange como dependencia
    ] // Dependencias para memo
  );

  // --- Configuración de TanStack Table ---
  const table = useReactTable({
    data: projectsData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      globalFilter,
      columnFilters,
      pagination,
    },
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: (newFiltersOrUpdater) => {
      setColumnFilters((oldFilters) => {
        const newFilters =
          typeof newFiltersOrUpdater === "function"
            ? newFiltersOrUpdater(oldFilters)
            : newFiltersOrUpdater;

        // console.log("Column Filters ACTUALIZADO por TanStack Table:", newFilters); // Descomentar para depurar
        return newFilters;
      });
    },

    onPaginationChange: setPagination,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    meta: {
      updateData: updateProjectData, // Pasar la función de actualización
    },
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-xl text-gray-700">Cargando datos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-xl text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-gradient-to-br from-slate-50 to-blue-50 px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Cartera de Proyectos
            </h1>
            <p className="text-gray-600">
              Edite directamente sobre las celdas. Los cambios se guardan
              automáticamente.
            </p>
          </div>
          <div className="flex space-x-3">
            <Button
              className="bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
              onClick={() => navigate("/anadir-proyectos")}
            >
              <Plus className="w-4 h-4 mr-2" />
              Crear Fila
            </Button>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          {/* Sección de Filtros PRINCIPAL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
            {/* Filtro por Unidad */}
            <div className="col-span-1">
              <Select
                value={
                  table.getColumn("unidad")?.getFilterValue()?.toString() ||
                  "all"
                }
                onValueChange={(value) => {
                  const filterValue =
                    value === "all" ? undefined : Number(value);
                  table.getColumn("unidad")?.setFilterValue(filterValue);
                }}
              >
                <SelectTrigger className="w-full cursor-pointer">
                  <SelectValue placeholder="Filtrar por Unidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las Unidades</SelectItem>
                  {unidadesData.map((u) => (
                    <SelectItem key={u.id_unidad} value={String(u.id_unidad)}>
                      {u.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Temática */}
            <div className="col-span-1">
              <Select
                value={
                  table
                    .getColumn("id_tematica")
                    ?.getFilterValue()
                    ?.toString() || "all"
                }
                onValueChange={(value) => {
                  const filterValue =
                    value === "all" ? undefined : Number(value);
                  table.getColumn("id_tematica")?.setFilterValue(filterValue);
                }}
              >
                <SelectTrigger className="w-full cursor-pointer">
                  <SelectValue placeholder="Filtrar por Temática" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key="all" value="all">
                    Todas las Temáticas
                  </SelectItem>
                  {tematicasData.map((t) => (
                    <SelectItem
                      key={t.id_tematica}
                      value={String(t.id_tematica)}
                    >
                      {t.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Estatus */}
            <div className="col-span-1">
              <Select
                value={
                  table.getColumn("id_estatus")?.getFilterValue()?.toString() ||
                  "all"
                }
                onValueChange={(value) => {
                  const filterValue =
                    value === "all" ? undefined : Number(value);
                  table.getColumn("id_estatus")?.setFilterValue(filterValue);
                }}
              >
                <SelectTrigger className="w-full cursor-pointer">
                  <SelectValue placeholder="Filtrar por Estatus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key="all" value="all">
                    Todos los Estatus
                  </SelectItem>
                  {estatusData.map((e) => (
                    <SelectItem key={e.id_estatus} value={String(e.id_estatus)}>
                      {e.tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Tipo Convocatoria */}
            <div className="col-span-1">
              <Select
                value={
                  table
                    .getColumn("tipo_convocatoria")
                    ?.getFilterValue()
                    ?.toString() || "all"
                }
                onValueChange={(value) => {
                  const filterValue =
                    value === "all" ? undefined : Number(value);
                  table
                    .getColumn("tipo_convocatoria")
                    ?.setFilterValue(filterValue);
                }}
              >
                <SelectTrigger className="w-full cursor-pointer">
                  <SelectValue placeholder="Filtrar por Tipo Convocatoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    Todos los Tipos de Convocatoria
                  </SelectItem>
                  {tiposConvocatoriaData.map((tc) => (
                    <SelectItem key={tc.id} value={String(tc.id)}>
                      {tc.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Institución Convocatoria */}
            <div className="col-span-1">
              <Select
                value={
                  table.getColumn("inst_conv")?.getFilterValue()?.toString() ||
                  "all"
                }
                onValueChange={(value) => {
                  const filterValue =
                    value === "all" ? undefined : Number(value);
                  table.getColumn("inst_conv")?.setFilterValue(filterValue);
                }}
              >
                <SelectTrigger className="w-full cursor-pointerl">
                  <SelectValue placeholder="Filtrar por Institución" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las Instituciones</SelectItem>
                  {institucionesData.map((i) => (
                    <SelectItem key={i.id} value={String(i.id)}>
                      {i.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Tipo Apoyo */}
            <div className="col-span-1">
              <Select
                value={
                  table.getColumn("apoyo")?.getFilterValue()?.toString() ||
                  "all"
                }
                onValueChange={(value) => {
                  const filterValue =
                    value === "all" ? undefined : Number(value);
                  table.getColumn("apoyo")?.setFilterValue(filterValue);
                }}
              >
                <SelectTrigger className="w-full cursor-pointer">
                  <SelectValue placeholder="Filtrar por Tipo Apoyo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Tipos de Apoyo</SelectItem>
                  {apoyosData.map((a) => (
                    <SelectItem key={a.id_apoyo} value={String(a.id_apoyo)}>
                      {a.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sección de Búsqueda y Rango de Montos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6 items-end">
            {/* Búsqueda Global */}
            <div className="col-span-full xl:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar por Nombre de Proyecto..."
                  className="pl-10 w-full"
                  value={globalFilter ?? ""}
                  onChange={(e) =>
                    table.setGlobalFilter(String(e.target.value))
                  }
                />
              </div>
            </div>

            {/* Botón Restablecer Filtros */}
            <div className="col-span-full sm:col-span-2 lg:col-span-1 flex ">
              <Button
                variant="outline"
                className=" bg-gray-200 cursor-pointer hover:bg-gray-300"
                onClick={() => {
                  setGlobalFilter("");
                  setColumnFilters([]);
                }}
              >
                <RotateCcw className="w-4 h-4 mr-2" /> Limpiar Filtros
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table
              className="min-w-full divide-y divide-gray-200"
              style={{ width: table.getTotalSize() }}
            >
              <thead className="bg-gray-50">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        colSpan={header.colSpan}
                        style={{ width: header.getSize() }}
                        className="relative px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            className={
                              header.column.getCanSort()
                                ? "cursor-pointer select-none"
                                : ""
                            }
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                            {header.column.getIsSorted() === "asc" ? (
                              <ArrowUp className="ml-1 h-4 w-4 inline-block" />
                            ) : header.column.getIsSorted() === "desc" ? (
                              <ArrowDown className="ml-1 h-4 w-4 inline-block" />
                            ) : (
                              ""
                            )}
                          </div>
                        )}
                        {header.column.getCanResize() && (
                          <div
                            onMouseDown={header.getResizeHandler()}
                            onTouchStart={header.getResizeHandler()}
                            className={`resizer ${
                              header.column.getIsResizing() ? "isResizing" : ""
                            }`}
                            style={{
                              position: "absolute",
                              right: 0,
                              top: 0,
                              height: "100%",
                              width: "10px",
                              zIndex: 10,
                              cursor: "col-resize",
                              userSelect: "none",
                              touchAction: "none",
                              background: header.column.getIsResizing()
                                ? "rgba(0,0,0,0.2)"
                                : "transparent",
                            }}
                          />
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-gray-200">
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-700"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center py-4 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Siguiente
              </Button>
            </div>
            <span className="flex-shrink-0">
              Página{" "}
              <strong>
                {table.getState().pagination.pageIndex + 1} de{" "}
                {table.getPageCount()}
              </strong>
            </span>
            <Select
              value={String(table.getState().pagination.pageSize)}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map((pageSize) => (
                  <SelectItem key={pageSize} value={String(pageSize)}>
                    Mostrar {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* AlertDialog para confirmación de eliminación */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás absolutamente segur@?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente
              el proyecto{" "}
              <strong>“{projectToDelete?.nombre || "seleccionado"}”</strong> de
              nuestros servidores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
