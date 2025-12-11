import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Users,
  CircleDollarSign,
  Calendar,
  GraduationCap,
  CheckCircle,
  XCircle,
} from "lucide-react";

export const getStatusBadge = (estatus) => {
  const baseClasses =
    "px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-md border shadow-sm whitespace-nowrap flex-shrink-0";
  let colorClasses = "";

  switch (estatus) {
    case "Postulado":
      colorClasses = "bg-blue-100/90 text-blue-700 border-blue-200/50";
      break;
    case "Perfil":
      colorClasses = "bg-yellow-100/90 text-yellow-700 border-yellow-200/50";
      break;
    case "Adjudicado":
      colorClasses = "bg-green-100/90 text-green-700 border-green-200/50";
      break;
    default:
      colorClasses = "bg-gray-100/90 text-gray-700 border-gray-200/50";
      break;
  }
  return (
    <Badge className={`${baseClasses} ${colorClasses}`}>
      <span>{estatus}</span>
    </Badge>
  );
};

export const getThematicBadge = (tematica) => {
  const baseClasses =
    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm border shadow-sm";
  let colorClasses = "bg-sky-100/80 text-sky-800 border-sky-200/50";

  return (
    <Badge className={`${baseClasses} ${colorClasses}`}>
      <span className="truncate">{tematica}</span>
    </Badge>
  );
};

export const getValidationBadge = (isValidated) => {
  if (isValidated) {
    return (
      <Badge className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-green-100/90 text-green-700 border border-green-200/50 shadow-sm">
        <CheckCircle className="h-3.5 w-3.5" />
        <span>VALIDADO</span>
      </Badge>
    );
  } else {
    return (
      <Badge className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-red-100/90 text-red-700 border border-red-200/50 shadow-sm">
        <XCircle className="h-3.5 w-3.5" />
        <span>NO VALIDADO</span>
      </Badge>
    );
  }
};

function SheetProjectCard({ project, onClick, showValidationBadge = false }) {
  const formatDateShort = (dateString) => {
    if (!dateString) return "Sin fecha";
    try {
      const date = new Date(dateString);
      if (isNaN(date)) return "Fecha Inválida";
      const options = { month: "short", year: "numeric" };
      let formatted = date.toLocaleDateString("es-CL", options);
      return formatted.replace(".", "");
    } catch (e) {
      return "Fecha Inválida";
    }
  };

  const projectName =
    project["Nombre Proyecto/Perfil Proyecto"] ||
    project["Nombre Proyecto"] ||
    project["Perfil Proyecto"] ||
    "Nombre no disponible";

  const unidad = project["Unidad Académica"] || "Sin unidad";
  const institucion = project["Institucion Convocatoria"] || "Sin institución";
  const monto = parseFloat(project["Monto Proyecto MM"] || 0);
  const tipoApoyo = project["Tipo Apoyo"] || "Sin información";
  const detalleApoyo = project["Detalle Apoyo"] || "";
  const academicosLider = project["Académic@/s-Líder"] || "Sin académicos";
  const estudiantes = project["Estudiantes"] || "";
  const fechaPostulacion = project["Fecha Postulación"] || null;
  const estado = project["Estatus"] || "Sin estado";
  const tematica = project["Temática"] || "Sin temática";

  const isValidated = String(project["VALIDAR"]).toLowerCase() === "true";

  // console.log("Proyecto:", projectName);
  // console.log("Valor VALIDAR:", project["VALIDAR"]);
  //  console.log("isValidated:", isValidated);
  //  console.log("Todas las keys:", Object.keys(project));

  return (
    <Card
      className={`group relative flex flex-col bg-white/40 backdrop-blur-xl rounded-2xl shadow-lg hover:shadow-2xl border-2 transition-all duration-300 overflow-hidden h-full cursor-pointer hover:scale-[1.02] hover:bg-white/70 ${
        showValidationBadge
          ? isValidated
            ? "border-green-300/60"
            : "border-red-300/60"
          : "border-white/60"
      }`}
      onClick={onClick}
    >
      {showValidationBadge && (
        <div className="absolute top-3 right-3 z-20">
          {getValidationBadge(isValidated)}
        </div>
      )}

      <CardHeader className="relative overflow-hidden bg-gradient-to-br from-[#2E5C8A] via-[#3B76B3] to-[#4A90D9] p-5 flex-shrink-0">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>

        <div className="relative z-10">
          <h3
            className={`text-lg font-bold text-white leading-tight mb-3 line-clamp-2 group-hover:text-blue-50 transition-colors ${
              showValidationBadge ? "pr-28" : ""
            }`}
          >
            {projectName}
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            {getThematicBadge(tematica)}
            {institucion && (
              <Badge className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/90 backdrop-blur-sm text-[#2E5C8A] border border-white/50 shadow-sm">
                <span className="truncate">{institucion}</span>
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-grow p-5 space-y-3">
        <div className="flex items-start gap-3 p-3 bg-white/60 backdrop-blur-sm rounded-xl border border-white/50 transition-all hover:bg-white/80">
          <div className="w-10 h-10 bg-[#2E5C8A] rounded-lg flex items-center justify-center flex-shrink-0">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <p className="font-semibold text-[#2E5C8A] text-sm truncate">
              {academicosLider}
            </p>
            <p className="text-xs text-gray-600 truncate">{unidad}</p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 bg-white/60 backdrop-blur-sm rounded-xl border border-white/50 transition-all hover:bg-white/80">
          <div className="w-10 h-10 bg-[#2E5C8A] rounded-lg flex items-center justify-center flex-shrink-0">
            <CircleDollarSign className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <p className="font-bold text-[#2E5C8A] text-sm">
              ${monto.toLocaleString("es-CL")}
            </p>
            <p className="text-xs text-gray-600 truncate">
              {tipoApoyo} {detalleApoyo && `(${detalleApoyo})`}
            </p>
          </div>
        </div>

        {estudiantes && estudiantes.trim().length > 0 && (
          <div className="flex items-start gap-3 p-3 bg-white/60 backdrop-blur-sm rounded-xl border border-white/50 transition-all hover:bg-white/80">
            <div className="w-10 h-10 bg-[#2E5C8A] rounded-lg flex items-center justify-center flex-shrink-0">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <p className="font-semibold text-[#2E5C8A] text-sm truncate">
                {estudiantes}
              </p>
              <p className="text-xs text-gray-600">Estudiantes Involucrados</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/50">
          <div className="flex items-center gap-2 px-3 py-2 bg-white/60 backdrop-blur-sm rounded-lg border border-white/50">
            <Calendar className="h-4 w-4 text-[#2E5C8A]" />
            <p className="font-bold text-[#2E5C8A] text-sm">
              {formatDateShort(fechaPostulacion)}
            </p>
          </div>
          {getStatusBadge(estado)}
        </div>
      </CardContent>
    </Card>
  );
}

export default SheetProjectCard;
