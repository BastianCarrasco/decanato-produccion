// src/components/FondosActivosSection.jsx
import { useState, useEffect, useCallback } from "react";
import fondosService from "../../api/fondos.js";
import tipoConvocatoriaService from "../../api/tipoconvocatoria.js";
import { useError } from "@/contexts/ErrorContext";
import { Spinner } from "@/components/ui/spinner";

// Iconos de Lucide React
import { Calendar, DollarSign, Clock, HandCoins } from "lucide-react";

// Importa los logos de las imágenes
import anidLogo from "../../assets/tipos_convocatorias/anid_rojo_azul.png";
import corfoLogo from "../../assets/tipos_convocatorias/corfo2024.png";
import goreLogo from "../../assets/tipos_convocatorias/gore-valpo.jpg";
import internasPucvLogo from "../../assets/tipos_convocatorias/internaspucv.svg";
import privadaLogo from "../../assets/tipos_convocatorias/private.png";

const FONDO_LOGOS = {
  ANID: anidLogo,
  CORFO: corfoLogo,
  GORE: goreLogo,
  Internas: internasPucvLogo,
  PRIVADA: privadaLogo,
};

export default function FondosActivosSection() {
  const [fondosActivos, setFondosActivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const { setError } = useError();
  const [tipoFondoMap, setTipoFondoMap] = useState({});
  const [currentDate, setCurrentDate] = useState(new Date());

  // --- Helpers ---
  const formatDate = useCallback((dateString) => {
    if (!dateString) return "Fecha no especificada";
    try {
      const options = { year: "numeric", month: "short", day: "numeric" };
      return new Date(dateString).toLocaleDateString("es-CL", options);
    } catch (e) {
      console.warn("Invalid date string:", dateString, e);
      return "Fecha inválida";
    }
  }, []);

  const isFondoVigente = useCallback(
    (fondo) => {
      if (!fondo.inicio || !fondo.cierre) return false;

      const hoy = currentDate;
      const hoyUTC = new Date(hoy.toISOString().slice(0, 10));
      hoyUTC.setUTCHours(0, 0, 0, 0);

      const inicioFondoUTC = new Date(fondo.inicio);
      const cierreFondoUTC = new Date(fondo.cierre);

      inicioFondoUTC.setUTCHours(0, 0, 0, 0);
      cierreFondoUTC.setUTCHours(23, 59, 59, 999);

      return hoyUTC >= inicioFondoUTC && hoyUTC <= cierreFondoUTC;
    },
    [currentDate]
  );

  const getDaysRemaining = useCallback(
    (cierreDateString) => {
      if (!cierreDateString) return null;

      const cierre = new Date(cierreDateString);
      cierre.setHours(23, 59, 59, 999);

      const hoy = currentDate;
      const hoyInicioDia = new Date(
        hoy.getFullYear(),
        hoy.getMonth(),
        hoy.getDate()
      );
      const cierreInicioDia = new Date(
        cierre.getFullYear(),
        cierre.getMonth(),
        cierre.getDate()
      );

      const diffTime = cierreInicioDia.getTime() - hoyInicioDia.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return { text: "Cierra hoy", urgent: true };
      if (diffDays === 1) return { text: "Cierra mañana", urgent: true };
      if (diffDays > 1 && diffDays <= 7)
        return { text: `${diffDays} días`, urgent: true };
      if (diffDays > 7) return { text: `${diffDays} días`, urgent: false };
      return null;
    },
    [currentDate]
  );

  // Función para obtener el renderizable del "logo"
  const renderFondoIconOrLogo = useCallback((tipoFondoNombre) => {
    const logoSrc = FONDO_LOGOS[tipoFondoNombre];
    if (logoSrc) {
      return (
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-[#2E5C8A]/20 to-[#4A90D9]/20 rounded-full blur-md"></div>
          <img
            src={logoSrc}
            alt={`${tipoFondoNombre} Logo`}
            className="relative h-12 w-12 object-contain rounded-full border-2 border-white/50 p-1.5 bg-white/80 backdrop-blur-sm shadow-lg flex-shrink-0"
          />
        </div>
      );
    } else if (tipoFondoNombre === "PRIVADA") {
      return (
        <div className="h-12 w-12 flex items-center justify-center bg-gradient-to-br from-gray-400 to-gray-600 rounded-full text-white text-sm font-bold flex-shrink-0 shadow-lg border-2 border-white/50">
          PRIV
        </div>
      );
    } else {
      return (
        <div className="h-12 w-12 flex items-center justify-center bg-gradient-to-br from-[#2E5C8A] to-[#4A90D9] rounded-full text-white text-sm font-bold flex-shrink-0 shadow-lg border-2 border-white/50">
          {tipoFondoNombre ? tipoFondoNombre.charAt(0) : "F"}
        </div>
      );
    }
  }, []);

  // --- Fetching de datos ---
  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const tiposResponse =
        await tipoConvocatoriaService.getAllTiposConvocatoria();
      const newTipoFondoMap = tiposResponse.reduce((map, tipo) => {
        map[tipo.id] = tipo.nombre;
        return map;
      }, {});
      setTipoFondoMap(newTipoFondoMap);

      const fondosResponse = await fondosService.getAllFondos();

      const processedAndFilteredFondos = fondosResponse
        .map((fondo) => {
          fondo["tipo de fondo"] = newTipoFondoMap[fondo.tipo] || "Desconocido";
          return fondo;
        })
        .filter((fondo) => isFondoVigente(fondo));

      setFondosActivos(processedAndFilteredFondos);
    } catch (e) {
      console.error("Error fetching data for Fondos Activos:", e);
      setError(
        e.message ||
          "Error desconocido al cargar los fondos activos y sus tipos."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    const timer = setInterval(
      () => {
        setCurrentDate(new Date());
      },
      1000 * 60 * 60 * 24
    );

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="h-full bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl border border-white/50 p-6">
      {/* Header con glassmorphism */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#2E5C8A] to-[#4A90D9] rounded-lg flex items-center justify-center shadow-md">
            <HandCoins className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#2E5C8A]">Fondos Activos</h3>
            <p className="text-xs text-gray-600">
              {loading ? "..." : `${fondosActivos.length} disponibles`}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-32">
          <Spinner size={32} className="text-[#2E5C8A]" />
        </div>
      ) : fondosActivos.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-8 h-8 text-blue-400" />
          </div>
          <p className="text-gray-500 text-sm font-medium">
            No hay fondos activos en este momento
          </p>
          <p className="text-gray-400 text-xs mt-1">
            Vuelve pronto para nuevas oportunidades
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-transparent">
          {fondosActivos.map((fondo, index) => {
            const daysRemaining = getDaysRemaining(fondo.cierre);
            
            return (
              <div
                key={fondo.id}
                className="group relative bg-white/60 backdrop-blur-md border border-white/60 rounded-xl p-4 hover:bg-white/80 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
              >
                {/* Badge urgente */}
                {daysRemaining && daysRemaining.urgent && (
                  <div className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg animate-pulse">
                    ¡Urgente!
                  </div>
                )}

                <div className="flex items-start gap-3">
                  {/* Logo con efecto de brillo */}
                  {renderFondoIconOrLogo(fondo["tipo de fondo"])}

                  <div className="flex-grow min-w-0">
                    {/* Nombre del fondo */}
                    <h4 className="font-semibold text-[#2E5C8A] text-sm leading-tight mb-1 truncate group-hover:text-[#3B76B3] transition-colors">
                      {fondo.nombre}
                    </h4>

                    {/* Tipo de fondo */}
                    {fondo["tipo de fondo"] && (
                      <div className="inline-block px-2 py-0.5 bg-blue-100/80 backdrop-blur-sm rounded-md mb-2">
                        <p className="text-[0.65rem] text-[#2E5C8A] font-medium uppercase tracking-wide">
                          {fondo["tipo de fondo"]}
                        </p>
                      </div>
                    )}

                    {/* Información de fecha y días restantes */}
                    <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                      <div className="flex items-center gap-1 bg-white/50 backdrop-blur-sm px-2 py-1 rounded-md">
                        <Calendar className="h-3 w-3 text-[#3B76B3]" />
                        <span className="font-medium">
                          {formatDate(fondo.cierre)}
                        </span>
                      </div>

                      {daysRemaining && (
                        <div
                          className={`flex items-center gap-1 px-2 py-1 rounded-md font-semibold backdrop-blur-sm ${
                            daysRemaining.urgent
                              ? "bg-red-100/80 text-red-700"
                              : "bg-blue-100/80 text-blue-700"
                          }`}
                        >
                          <Clock className="h-3 w-3" />
                          <span>{daysRemaining.text}</span>
                        </div>
                      )}
                    </div>

                    {/* Financiamiento */}
                    <div className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50/80 backdrop-blur-sm px-2 py-1 rounded-md w-fit">
                      <DollarSign className="h-3.5 w-3.5 text-green-600" />
                      <span>
                        {fondo.financiamiento || "Monto no especificado"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Barra de progreso visual (decorativa) */}
                <div className="mt-3 h-1 bg-gray-200/50 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      daysRemaining && daysRemaining.urgent
                        ? "bg-gradient-to-r from-red-500 to-orange-500"
                        : "bg-gradient-to-r from-[#2E5C8A] to-[#4A90D9]"
                    }`}
                    style={{
                      width: daysRemaining && daysRemaining.urgent ? "100%" : "60%",
                    }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
