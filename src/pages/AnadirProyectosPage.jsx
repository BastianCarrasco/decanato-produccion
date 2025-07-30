// src/pages/AnadirProyectosPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, // Usaremos Select de Shadcn para ambos campos académicos
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Save,
  FolderPlus,
  CircleDollarSign,
  Tag,
  Wallet,
  MessageSquareText,
  Calendar,
  Landmark,
  Pin,
  Megaphone,
  Building,
  School,
  Users, // Para Otros Académicos
  User, // Para el Jefe Académico
  Search, // Para el input de búsqueda dentro del SelectContent
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { XCircle } from "lucide-react";

import { useError } from "@/contexts/ErrorContext";

import proyectosService from "../api/proyectos.js";
import funcionesService from "../api/funciones.js";
import unidadesAcademicasService from "../api/unidadesacademicas.js";
import estatusService from "../api/estatus.js";
import institucionesConvocatoriaService from "../api/institucionconvocatoria.js";
import apoyosService from "../api/apoyos.js";
import tematicasService from "../api/tematicas.js";
import tagsService from "../api/tags.js";
import tipoConvocatoriaService from "../api/tipoconvocatoria.js";
import academicosService from "../api/academicos.js";

export default function AnadirProyectosPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nombre: "",
    comentarios: "",
    monto: "",
    id_tematica: null,
    apoyo: null,
    detalle_apoyo: "",
    fecha_postulacion: "",
    id_estatus: null,
    convocatoria: "",
    tipo_convocatoria: null,
    inst_conv: null,
    unidad: null,
    jefe_academico: null,
  });

  const [selectedAcademics, setSelectedAcademics] = useState([]);

  const [unidadesLookup, setUnidadesLookup] = useState([]);
  const [estatusLookup, setEstatusLookup] = useState([]);
  const [institucionesLookup, setInstitucionesLookup] = useState([]);
  const [apoyosLookup, setApoyosLookup] = useState([]);
  const [tematicasLookup, setTematicasLookup] = useState([]);
  const [tagsLookup, setTagsLookup] = useState([]);
  const [tipoConvocatoriasLookup, setTipoConvocatoriasLookup] = useState([]);
  const [academicosGeneralesLookup, setAcademicosGeneralesLookup] = useState(
    []
  );
  const [academicosMap, setAcademicosMap] = useState({});

  const [apoyosMap, setApoyosMap] = useState({});

  const [loadingLookups, setLoadingLookups] = useState(true);
  const [errorLookups, setErrorLookups] = useState(null);
  const { setError: setErrorGlobal } = useError();

  const [academicSearchTerm, setAcademicSearchTerm] = useState("");
  const [isOtherAcademicsSelectOpen, setIsOtherAcademicsSelectOpen] =
    useState(false); // Nuevo estado para controlar la apertura del Select de otros académicos

  // Handler para Jefe Académico (Select de Shadcn)
  const handleJefeAcademicoChange = useCallback((value) => {
    const newJefeId = Number(value);
    setFormData((prev) => ({ ...prev, jefe_academico: newJefeId }));

    setSelectedAcademics((prevOthers) =>
      prevOthers.filter((id) => id !== newJefeId)
    );
  }, []);

  // Handler para seleccionar un académico de la lista de "Otros Académicos"
  const handleSelectOtherAcademic = useCallback(
    (academicId) => {
      const numAcademicId = Number(academicId);
      // Asegurarse de que el ID no sea el del jefe y no esté ya seleccionado
      if (
        numAcademicId &&
        !selectedAcademics.includes(numAcademicId) &&
        numAcademicId !== formData.jefe_academico
      ) {
        setSelectedAcademics((prevSelected) => [
          ...prevSelected,
          numAcademicId,
        ]);
        setAcademicSearchTerm(""); // Limpiar el término de búsqueda
        setIsOtherAcademicsSelectOpen(false); // Cierra el SelectContent después de seleccionar
      } else if (numAcademicId === formData.jefe_academico) {
        setErrorGlobal({
          type: "error",
          title: "El académico seleccionado ya es el Jefe Académico.",
        });
      }
    },
    [selectedAcademics, formData.jefe_academico, setErrorGlobal]
  );

  const handleRemoveAcademic = (academicId) => {
    setSelectedAcademics((prevSelected) =>
      prevSelected.filter((id) => id !== academicId)
    );
  };

  const fetchLookupsData = async () => {
    setLoadingLookups(true);
    setErrorLookups(null);
    setErrorGlobal(null);
    try {
      const [
        unidadesRes,
        estatusRes,
        institucionesRes,
        apoyosRes,
        tematicasRes,
        tagsRes,
        tipoConvocatoriasRes,
        academicosGeneralesApiRes,
      ] = await Promise.all([
        unidadesAcademicasService.getAllUnidadesAcademicas(),
        estatusService.getAllEstatus(),
        institucionesConvocatoriaService.getAllInstitucionesConvocatoria(),
        apoyosService.getAllApoyos(),
        tematicasService.getAllTematicas(),
        tagsService.getAllTags(),
        tipoConvocatoriaService.getAllTiposConvocatoria(),
        academicosService.getAllAcademicos(),
      ]);

      setUnidadesLookup(unidadesRes);
      setEstatusLookup(estatusRes);
      setInstitucionesLookup(institucionesRes);
      setTematicasLookup(tematicasRes);
      setTagsLookup(tagsRes);
      setTipoConvocatoriasLookup(tipoConvocatoriasRes);

      const processedAcademicosGenerales = academicosGeneralesApiRes
        .map((acad) => ({
          id_academico: acad.id_academico,
          nombre_completo: `${acad.nombre || ""} ${acad.a_paterno || ""} ${
            acad.a_materno || ""
          }`.trim(),
        }))
        .sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo));
      setAcademicosGeneralesLookup(processedAcademicosGenerales);

      const newAcademicosMap = processedAcademicosGenerales.reduce(
        (map, acad) => {
          map[acad.id_academico] = acad.nombre_completo;
          return map;
        },
        {}
      );
      setAcademicosMap(newAcademicosMap);

      const newApoyosMap = apoyosRes.reduce((map, apoyo) => {
        map[apoyo.id_apoyo] = apoyo.nombre;
        return map;
      }, {});
      setApoyosMap(newApoyosMap);
      setApoyosLookup(apoyosRes);
    } catch (err) {
      console.error("Error fetching lookup data:", err);
      setErrorGlobal({
        type: "error",
        title: "Error al cargar las opciones del formulario.",
      });
    } finally {
      setLoadingLookups(false);
    }
  };

  useEffect(() => {
    fetchLookupsData();
  }, []);

  const handleSaveProject = async () => {
    if (
      !formData.nombre ||
      !formData.fecha_postulacion ||
      formData.id_estatus === null
    ) {
      setErrorGlobal({
        type: "error",
        title: "Por favor, complete todos los campos obligatorios.",
      });
      return;
    }

    setLoadingLookups(true);
    setErrorLookups(null);
    setErrorGlobal(null);

    try {
      const academicosParaPost = [];
      if (formData.jefe_academico) {
        academicosParaPost.push({ id: formData.jefe_academico, jefe: true });
      }
      selectedAcademics.forEach((id) => {
        if (id !== formData.jefe_academico) {
          academicosParaPost.push({ id: id, jefe: false });
        }
      });

      const projectToSave = {
        nombre: formData.nombre,
        comentarios: formData.comentarios || null,
        monto: formData.monto ? parseFloat(formData.monto) : 0,
        fecha_postulacion: formData.fecha_postulacion
          ? new Date(formData.fecha_postulacion).toISOString()
          : null,
        unidad: formData.unidad,
        id_tematica: formData.id_tematica,
        id_estatus: formData.id_estatus,
        convocatoria: formData.convocatoria || null,
        tipo_convocatoria: formData.tipo_convocatoria,
        inst_conv: formData.inst_conv,
        detalle_apoyo: formData.detalle_apoyo || null,
        apoyo: formData.apoyo,
        academicos: academicosParaPost,
      };

      const response = await proyectosService.crearProyecto(projectToSave);

      setTimeout(() => {
        setErrorGlobal({
          type: "success",
          title: "Proyecto guardado exitosamente!",
        });
        navigate("/editar-proyectos");
      }, 3000);
    } catch (err) {
      console.error("Error guardando proyecto:", err);
      setErrorLookups(
        err.message || "Error desconocido al guardar el proyecto."
      );
      setErrorGlobal({
        type: "error",
        title: "No se ha podido guardar el proyecto",
      });
    } finally {
      setLoadingLookups(false);
    }
  };

  // Lista de académicos disponibles para el Jefe (excluye solo a los de "Otros")
  const availableAcademicsForJefe = useMemo(() => {
    return academicosGeneralesLookup.filter(
      (academic) => !selectedAcademics.includes(academic.id_academico)
    );
  }, [academicosGeneralesLookup, selectedAcademics]);

  // Lista filtrada de académicos para "Otros Académicos" (excluye al jefe y ya seleccionados, y aplica búsqueda)
  const filteredAcademicsForOthers = useMemo(() => {
    return academicosGeneralesLookup.filter(
      (academic) =>
        academic.id_academico !== formData.jefe_academico && // Excluye al jefe
        !selectedAcademics.includes(academic.id_academico) && // Excluye a los ya seleccionados en la lista de badges
        academic.nombre_completo
          .toLowerCase()
          .includes(academicSearchTerm.toLowerCase())
    );
  }, [
    academicosGeneralesLookup,
    formData.jefe_academico,
    selectedAcademics,
    academicSearchTerm,
  ]);

  return (
    <div className="h-full bg-gradient-to-br from-slate-50 to-blue-50 px-4 sm:px-6 lg:px-8 py-12">
      {loadingLookups && (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-120px)]">
          <Spinner size={64} className="text-[#2E5C8A] mb-4" />
          <p className="text-lg text-gray-600">Cargando...</p>
        </div>
      )}
      {errorLookups && (
        <div className="fixed top-4 right-4 z-50 w-full max-w-sm">
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Error de Formulario</AlertTitle>
            <AlertDescription>{errorLookups}</AlertDescription>
          </Alert>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Añadir proyecto
            </h1>
            <p className="text-gray-600">
              Complete la información del nuevo proyecto
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Columna Izquierda */}
            <div className="space-y-6">
              <div>
                <div className="flex gap-1">
                  <FolderPlus strokeWidth={1.5} size={20} />
                  <Label
                    htmlFor="nombre"
                    className="text-sm font-medium text-gray-700"
                  >
                    Nombre del Proyecto
                  </Label>
                </div>
                <Input
                  id="nombre"
                  placeholder="Ingrese el nombre del proyecto"
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData({ ...formData, nombre: e.target.value })
                  }
                  className="mt-1 w-full"
                />
                <p className="mt-1 text-xs text-blue-600">
                  Este campo es obligatorio
                </p>
              </div>

              <div>
                <div className="flex gap-1">
                  <Pin strokeWidth={1.5} size={20} />
                  <Label className="text-sm font-medium text-gray-700">
                    Estatus
                  </Label>
                </div>
                <Select
                  onValueChange={(value) =>
                    setFormData({ ...formData, id_estatus: value })
                  }
                  value={formData.id_estatus || ""}
                >
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue placeholder="Seleccione un estado" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] overflow-y-auto">
                    {estatusLookup.map((status) => (
                      <SelectItem
                        key={status.id_estatus}
                        value={status.id_estatus}
                      >
                        {status.tipo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-blue-600">
                  Este campo es obligatorio
                </p>
              </div>

              <div>
                <div className="flex gap-1">
                  <Calendar strokeWidth={1.5} size={20} />
                  <Label
                    htmlFor="fecha_postulacion"
                    className="text-sm font-medium text-gray-700"
                  >
                    Fecha de Ingreso
                  </Label>
                </div>
                <Input
                  id="fecha_postulacion"
                  type="date"
                  value={formData.fecha_postulacion}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      fecha_postulacion: e.target.value,
                    })
                  }
                  className="mt-1 w-full"
                />
                <p className="mt-1 text-xs text-blue-600">
                  Este campo es obligatorio
                </p>
              </div>

              <div>
                <div className="flex gap-1">
                  <Tag strokeWidth={1.5} size={20} />
                  <Label className="text-sm font-medium text-gray-700">
                    Temática
                  </Label>
                </div>
                <Select
                  onValueChange={(value) =>
                    setFormData({ ...formData, id_tematica: value })
                  }
                  value={formData.id_tematica || ""}
                >
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue placeholder="Seleccione una temática" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] overflow-y-auto">
                    {tematicasLookup.map((theme) => (
                      <SelectItem
                        key={theme.id_tematica}
                        value={theme.id_tematica}
                      >
                        {theme.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex gap-1">
                  <Wallet strokeWidth={1.5} size={20} />
                  <Label className="text-sm font-medium text-gray-700">
                    Tipo(s) de Apoyo
                  </Label>
                </div>
                <div className="mt-2 space-y-2">
                  <Select
                    onValueChange={(value) =>
                      setFormData({ ...formData, apoyo: value })
                    }
                    value={formData.apoyo || ""}
                  >
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue placeholder="Seleccione tipo de apoyo" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px] overflow-y-auto">
                      {apoyosLookup.map((apoyo) => (
                        <SelectItem key={apoyo.id_apoyo} value={apoyo.id_apoyo}>
                          {apoyo.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Detalle de Apoyo: Siempre Input de texto libre */}
                  {/* Se muestra si el apoyo es PARCIAL u OTRO, o siempre si deseas */}
                  {/* He puesto la condición para que aparezca sólo si hay apoyo seleccionado, si no, es 'null' */}
                  {formData.apoyo !== null && (
                    <div>
                      <Label
                        htmlFor="detalle_apoyo"
                        className="text-sm font-medium text-gray-700 mt-4"
                      >
                        Detalle Apoyo
                      </Label>
                      <Input
                        id="detalle_apoyo"
                        placeholder="Ingrese detalle de apoyo"
                        value={formData.detalle_apoyo}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            detalle_apoyo: e.target.value,
                          })
                        }
                        className="mt-1"
                      />
                    </div>
                  )}
                </div>
              </div>
              {/* Comentarios (descomentado para uso) */}
              <div>
                <div className="flex gap-1">
                  <MessageSquareText strokeWidth={1.5} size={20} />
                  <Label
                    htmlFor="comentarios"
                    className="text-sm font-medium text-gray-700"
                  >
                    Comentarios
                  </Label>
                </div>

                <Textarea
                  id="comentarios"
                  placeholder="Agregue comentarios relevantes"
                  value={formData.comentarios}
                  onChange={(e) =>
                    setFormData({ ...formData, comentarios: e.target.value })
                  }
                  className="mt-1 min-h-[100px]"
                />
              </div>
            </div>

            {/* Columna Derecha */}
            <div className="space-y-6">
              <div>
                <div className="flex gap-1">
                  <CircleDollarSign strokeWidth={1.5} size={20} />
                  <Label
                    htmlFor="monto"
                    className="text-sm font-medium text-gray-700"
                  >
                    Monto
                  </Label>
                </div>
                <Input
                  id="monto"
                  type="number"
                  placeholder="Sin signo $"
                  value={formData.monto}
                  onChange={(e) =>
                    setFormData({ ...formData, monto: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <div className="flex gap-1">
                  <Megaphone strokeWidth={1.5} size={20} />
                  <Label className="text-sm font-medium text-gray-700">
                    Nombre de Convocatoria
                  </Label>{" "}
                  {/* Cambiado el Label */}
                </div>
                <Input // AHORA ES UN INPUT DE TEXTO LIBRE
                  id="convocatoria_nombre"
                  placeholder="Ingrese el nombre de la convocatoria"
                  value={formData.convocatoria}
                  onChange={(e) =>
                    setFormData({ ...formData, convocatoria: e.target.value })
                  }
                  className="mt-1  w-full"
                />
              </div>

              <div>
                <div className="flex gap-1">
                  <Tag strokeWidth={1.5} size={20} />{" "}
                  {/* Nuevo icono para Tipo Convocatoria */}
                  <Label className="text-sm font-medium text-gray-700">
                    Tipo de Convocatoria
                  </Label>{" "}
                  {/* Cambiado el Label */}
                </div>
                <Select
                  onValueChange={(value) =>
                    setFormData({ ...formData, tipo_convocatoria: value })
                  }
                  value={formData.tipo_convocatoria || ""}
                >
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue placeholder="Seleccione un tipo de convocatoria" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] overflow-y-auto">
                    {tipoConvocatoriasLookup.map((conv) => (
                      <SelectItem key={conv.id} value={conv.id}>
                        {conv.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex gap-1">
                  <Landmark strokeWidth={1.5} size={20} />
                  <Label className="text-sm font-medium text-gray-700">
                    Institución Convocatoria
                  </Label>
                </div>
                <Select
                  onValueChange={(value) =>
                    setFormData({ ...formData, inst_conv: value })
                  }
                  value={formData.inst_conv || ""}
                >
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue placeholder="Seleccione institución" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] overflow-y-auto">
                    {institucionesLookup.map((inst) => (
                      <SelectItem key={inst.id} value={inst.id}>
                        {inst.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex gap-1">
                  <School strokeWidth={1.5} size={20} />
                  <Label className="text-sm font-medium text-gray-700">
                    Unidad Académica
                  </Label>
                </div>
                <Select
                  onValueChange={(value) =>
                    setFormData({ ...formData, unidad: value })
                  }
                  value={formData.unidad || ""}
                >
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue placeholder="Seleccione una unidad" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] overflow-y-auto">
                    {unidadesLookup.map((unit) => (
                      <SelectItem key={unit.id_unidad} value={unit.id_unidad}>
                        {unit.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* JEFE ACADÉMICO - USANDO Shadcn Select */}
              <div>
                <div className="flex gap-1">
                  <User strokeWidth={1.5} size={20} />
                  <Label className="text-sm font-medium text-gray-700">
                    Académico Jefe de Proyecto
                  </Label>
                </div>
                <Select
                  onValueChange={handleJefeAcademicoChange}
                  value={formData.jefe_academico || ""}
                >
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue placeholder="Seleccione un jefe académico" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] overflow-y-auto">
                    {availableAcademicsForJefe.map((academic) => (
                      <SelectItem
                        key={academic.id_academico}
                        value={academic.id_academico}
                      >
                        {academic.nombre_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* OTROS ACADÉMICOS PARTICIPANTES - USANDO Shadcn Select con búsqueda Y MULTI-SELECCIÓN DE BADGES */}
              <div>
                <div className="flex gap-1">
                  <Users strokeWidth={1.5} size={20} />
                  <Label className="text-sm font-medium text-gray-700">
                    Otros Académicos Participantes (puede seleccionar más de
                    uno)
                  </Label>
                </div>
                {/* SELECTOR REAL */}
                <Select
                  value={""} // Mantiene el valor vacío para permitir la selección continua de nuevas opciones
                  onValueChange={handleSelectOtherAcademic}
                  onOpenChange={(open) => {
                    if (!open) {
                      setAcademicSearchTerm(""); // Limpiar búsqueda al cerrar
                    }
                    setIsOtherAcademicsSelectOpen(open);
                  }}
                  open={isOtherAcademicsSelectOpen} // Controla la apertura del SelectContent
                >
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue placeholder="Seleccione académicos adicionales" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[250px] overflow-y-auto mt-0 p-0 rounded-md shadow-md border">
                    {/* Input de búsqueda DENTRO del SelectContent */}
                    <div className=" px-2 py-2 sticky top-0 bg-white z-10 border-b">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Buscar académico..."
                        className="pl-8 py-2 text-sm focus-visible:ring-offset-0 focus-visible:ring-transparent border-none shadow-none"
                        value={academicSearchTerm}
                        onChange={(e) => setAcademicSearchTerm(e.target.value)}
                        onClick={(e) => e.stopPropagation()} // Evita que se cierre el select al hacer clic en el input
                        // AÑADIR ESTAS DOS PROPS:
                        onKeyDown={(e) => e.stopPropagation()} // Detiene la propagación del evento de teclado al Select
                        onKeyUp={(e) => e.stopPropagation()} // También detiene keyup si es necesario
                      />
                    </div>
                    {/* Opciones filtradas */}
                    {loadingLookups ? (
                      <SelectItem
                        value="loading"
                        disabled
                        className="text-center py-2"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Spinner size={16} className="text-gray-800" />{" "}
                          Cargando académicos...
                        </div>
                      </SelectItem>
                    ) : filteredAcademicsForOthers.length === 0 ? (
                      <SelectItem
                        value="no-data"
                        disabled
                        className="text-center py-2"
                      >
                        No hay académicos disponibles.
                      </SelectItem>
                    ) : (
                      filteredAcademicsForOthers.map((academic) => (
                        <SelectItem
                          key={academic.id_academico}
                          value={academic.id_academico}
                          className="px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 data-[highlighted]:bg-gray-100"
                        >
                          {academic.nombre_completo}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>

                {/* Badges para mostrar los académicos seleccionados */}
                {selectedAcademics.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <p className="text-sm font-medium text-gray-700 w-full mb-1">
                      Seleccionados:
                    </p>
                    {selectedAcademics.map(
                      (academicId) =>
                        academicosMap[academicId] && (
                          <Badge
                            key={academicId}
                            variant="secondary"
                            className="flex items-center gap-1 bg-blue-100 text-blue-800"
                          >
                            {academicosMap[academicId]}{" "}
                            <Button
                              type="button"
                              onClick={() => handleRemoveAcademic(academicId)}
                              className="bg-blue-300 hover:bg-blue-400 text-blue-900 p-0.5 w-5 h-5 rounded-full flex items-center justify-center"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </Badge>
                        )
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end space-x-3 pt-8 border-t mt-8">
            <Button
              variant="outline"
              onClick={() => navigate("/visualizacion")}
            >
              Cancelar
            </Button>
            <Button
              className="bg-[#2E5C8A] hover:bg-[#1E4A6F]"
              onClick={handleSaveProject}
            >
              <Save className="w-4 h-4 mr-2" />
              Guardar Proyecto
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
