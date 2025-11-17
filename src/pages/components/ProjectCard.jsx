import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Users,
  Tag,
  Calendar,
  Zap,
  FlaskRound,
  Lightbulb,
  Pickaxe,
  Dna,
  BatteryCharging,
  CircleDollarSign,
  GraduationCap,
  Scale,
  Droplet,
  Plug,
  HeartPulse,
  Recycle,
  Utensils,
  Network,
  Atom,
  RadioTower,
  Code,
  Layers,
  RectangleGoggles,
  BookOpenCheck,
  Telescope,
  ShieldAlert,
  Radar,
} from "lucide-react";

import anidLogo from "../../assets/tipos_convocatorias/anid_rojo_azul.png";
import corfoLogo from "../../assets/tipos_convocatorias/corfo2024.png";
import goreLogo from "../../assets/tipos_convocatorias/gore-valpo.jpg";
import sqmLogo from "../../assets/instituciones/sqm.png";
import codesserLogo from "../../assets/instituciones/logo-codesser2.png";
import pucvLogo from "../../assets/instituciones/pucv.svg";
import logoLacnic from "../../assets/instituciones/Logo-LACNIC.png";
import armadaLogo from "../../assets/instituciones/armadaLogo.png";

const INSTITUCION_LOGOS = {
  ANID: anidLogo,
  CORFO: corfoLogo,
  "GORE-Valparaíso": goreLogo,
  "CORFO-Magallanes": corfoLogo,
  SQM: sqmLogo,
  CODESSER: codesserLogo,
  PUCV: pucvLogo,
  LACNIC: logoLacnic,
  "Armada de Chile": armadaLogo,
};

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
  const iconClass = "h-4 w-4";
  let icon;
  let colorClasses = "bg-sky-100/80 text-sky-800 border-sky-200/50";

  switch (tematica) {
    case "Almacenamiento Energía":
      icon = <Zap className={iconClass} />;
      colorClasses = "bg-yellow-100/80 text-yellow-800 border-yellow-200/50";
      break;
    case "Hidrógeno":
      icon = <FlaskRound className={iconClass} />;
      colorClasses = "bg-purple-100/80 text-purple-800 border-purple-200/50";
      break;
    case "Contaminación Lumínica":
      icon = <Lightbulb className={iconClass} />;
      colorClasses = "bg-amber-100/80 text-amber-800 border-amber-200/50";
      break;
    case "Educación":
      icon = <GraduationCap className={iconClass} />;
      colorClasses = "bg-indigo-100/80 text-indigo-800 border-indigo-200/50";
      break;
    case "Software":
      icon = <Code className={iconClass} />;
      colorClasses = "bg-slate-100/80 text-slate-800 border-slate-200/50";
      break;
    case "Seguridad":
      icon = <ShieldAlert className={iconClass} />;
      colorClasses = "bg-red-100/80 text-red-800 border-red-200/50";
      break;
    case "Sensores":
      icon = <Radar className={iconClass} />;
      colorClasses = "bg-cyan-100/80 text-cyan-800 border-cyan-200/50";
      break;
    case "Minería":
      icon = <Pickaxe className={iconClass} />;
      colorClasses = "bg-orange-100/80 text-orange-800 border-orange-200/50";
      break;
    case "Agua":
      icon = <Droplet className={iconClass} />;
      colorClasses = "bg-blue-100/80 text-blue-800 border-blue-200/50";
      break;
    case "Energía":
      icon = <Plug className={iconClass} />;
      colorClasses = "bg-lime-100/80 text-lime-800 border-lime-200/50";
      break;
    case "LegalTech":
      icon = <Scale className={iconClass} />;
      colorClasses = "bg-stone-100/80 text-stone-800 border-stone-200/50";
      break;
    case "Salud":
      icon = <HeartPulse className={iconClass} />;
      colorClasses = "bg-rose-100/80 text-rose-800 border-rose-200/50";
      break;
    case "Economía Circular":
      icon = <Recycle className={iconClass} />;
      colorClasses = "bg-green-100/80 text-green-800 border-green-200/50";
      break;
    case "Alimentos":
      icon = <Utensils className={iconClass} />;
      colorClasses = "bg-orange-100/80 text-orange-800 border-orange-200/50";
      break;
    case "Interdisciplina":
      icon = <Network className={iconClass} />;
      colorClasses = "bg-violet-100/80 text-violet-800 border-violet-200/50";
      break;
    case "Gemelos Digitales":
      icon = <Layers className={iconClass} />;
      colorClasses = "bg-teal-100/80 text-teal-800 border-teal-200/50";
      break;
    case "Realidad Virtual":
      icon = <RectangleGoggles className={iconClass} />;
      colorClasses = "bg-fuchsia-100/80 text-fuchsia-800 border-fuchsia-200/50";
      break;
    case "Armonización Curricular":
      icon = <BookOpenCheck className={iconClass} />;
      colorClasses = "bg-emerald-100/80 text-emerald-800 border-emerald-200/50";
      break;
    case "Astronomía":
      icon = <Telescope className={iconClass} />;
      colorClasses = "bg-indigo-100/80 text-indigo-800 border-indigo-200/50";
      break;
    case "STEM":
      icon = <Atom className={iconClass} />;
      colorClasses = "bg-pink-100/80 text-pink-800 border-pink-200/50";
      break;
    case "Telecomunicaciones":
      icon = <RadioTower className={iconClass} />;
      colorClasses = "bg-sky-100/80 text-sky-800 border-sky-200/50";
      break;
    case "Biotecnología":
      icon = <Dna className={iconClass} />;
      colorClasses = "bg-green-100/80 text-green-800 border-green-200/50";
      break;
    case "Litio":
      icon = <BatteryCharging className={iconClass} />;
      colorClasses = "bg-yellow-100/80 text-yellow-800 border-yellow-200/50";
      break;
    default:
      icon = <Tag className={iconClass} />;
      break;
  }
  return (
    <Badge className={`${baseClasses} ${colorClasses}`}>
      {icon} <span className="truncate">{tematica}</span>
    </Badge>
  );
};

export const renderInstitucionLogo = (nombreInstitucion) => {
  const logoSrc = INSTITUCION_LOGOS[nombreInstitucion];
  if (logoSrc) {
    return (
      <img
        src={logoSrc}
        alt={`${nombreInstitucion} Logo`}
        className="h-5 w-5 object-contain rounded-md border border-white/50 bg-white/80 backdrop-blur-sm p-0.5"
      />
    );
  } else if (nombreInstitucion === "PRIVADA") {
    return (
      <div className="h-5 w-5 flex items-center justify-center bg-gray-200/80 backdrop-blur-sm rounded-full text-gray-700 text-[0.6rem] font-bold flex-shrink-0 border border-gray-300/50">
        PRIV
      </div>
    );
  }
  return null;
};

function ProjectCard({
  project,
  academicosDelProyecto,
  estudiantesDelProyecto,
  onClick,
}) {
  const formatDateShort = (dateString) => {
    if (!dateString) return "Sin fecha";
    try {
      const date = new Date(dateString);
      if (isNaN(date)) return "Fecha Inválida";
      const options = { month: "short", year: "numeric" };
      let formatted = date.toLocaleDateString("es-CL", options);
      formatted = formatted.replace(".", "");
      return formatted;
    } catch (e) {
      console.warn(
        "Invalid date string for ProjectCard (short format):",
        dateString,
        e
      );
      return "Fecha Inválida";
    }
  };

  const academicosNames =
    academicosDelProyecto && Array.isArray(academicosDelProyecto.profesores)
      ? academicosDelProyecto.profesores
          .map((p) => p.nombre_completo)
          .join(", ")
      : "Sin académicos involucrados";

  const estudiantesNames =
    estudiantesDelProyecto && Array.isArray(estudiantesDelProyecto)
      ? estudiantesDelProyecto
          .map((e) => `${e.nombre} ${e.a_paterno || ""}`.trim())
          .join(", ")
      : "";

  return (
    <Card
      className="group relative flex flex-col bg-white/40 backdrop-blur-xl rounded-2xl shadow-lg hover:shadow-2xl border border-white/60 transition-all duration-300 overflow-hidden h-full cursor-pointer hover:scale-[1.02] hover:bg-white/70"
      onClick={onClick}
    >
      {/* Header con gradiente */}
      <CardHeader className="relative overflow-hidden bg-gradient-to-br from-[#2E5C8A] via-[#3B76B3] to-[#4A90D9] p-5 flex-shrink-0">
        {/* Decoración de fondo */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>

        <div className="relative z-10">
          <h3 className="text-lg font-bold text-white leading-tight mb-3 line-clamp-2 group-hover:text-blue-50 transition-colors">
            {project.nombre || "Nombre no disponible"}
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            {getThematicBadge(project.tematica)}
            {project.institucion && (
              <Badge className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/90 backdrop-blur-sm text-[#2E5C8A] border border-white/50 shadow-sm">
                {renderInstitucionLogo(project.institucion)}
                <span className="truncate">{project.institucion}</span>
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-grow p-5 space-y-3">
        {/* Líder / Profesores - Íconos Minimalistas */}
        <div className="flex items-start gap-3 p-3 bg-white/60 backdrop-blur-sm rounded-xl border border-white/50 transition-all hover:bg-white/80">
          <div className="w-10 h-10 bg-[#2E5C8A] rounded-lg flex items-center justify-center flex-shrink-0">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <p className="font-semibold text-[#2E5C8A] text-sm truncate">
              {academicosNames}
            </p>
            <p className="text-xs text-gray-600 truncate">
              {project.unidad || "Sin información"}
            </p>
          </div>
        </div>

        {/* Monto - Íconos Minimalistas */}
        <div className="flex items-start gap-3 p-3 bg-white/60 backdrop-blur-sm rounded-xl border border-white/50 transition-all hover:bg-white/80">
          <div className="w-10 h-10 bg-[#2E5C8A] rounded-lg flex items-center justify-center flex-shrink-0">
            <CircleDollarSign className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <p className="font-bold text-[#2E5C8A] text-sm">
              ${project.monto.toLocaleString("es-CL")}
            </p>
            <p className="text-xs text-gray-600 truncate">
              Apoyo {project.apoyo || "Sin información"} (
              {project.detalle_apoyo || "Sin información"})
            </p>
          </div>
        </div>

        {/* Estudiantes - Íconos Minimalistas */}
        {estudiantesNames.length > 0 && (
          <div className="flex items-start gap-3 p-3 bg-white/60 backdrop-blur-sm rounded-xl border border-white/50 transition-all hover:bg-white/80">
            <div className="w-10 h-10 bg-[#2E5C8A] rounded-lg flex items-center justify-center flex-shrink-0">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <p className="font-semibold text-[#2E5C8A] text-sm truncate">
                {estudiantesNames}
              </p>
              <p className="text-xs text-gray-600">Estudiantes Involucrados</p>
            </div>
          </div>
        )}

        {/* Footer con fecha y badge */}
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/50">
          <div className="flex items-center gap-2 px-3 py-2 bg-white/60 backdrop-blur-sm rounded-lg border border-white/50">
            <Calendar className="h-4 w-4 text-[#2E5C8A]" />
            <p className="font-bold text-[#2E5C8A] text-sm">
              {formatDateShort(project.fecha_postulacion)}
            </p>
          </div>
          {getStatusBadge(project.estatus)}
        </div>
      </CardContent>
    </Card>
  );
}

export default ProjectCard;
