// src/api/estadisticasBackend.js

const VITE_URL_BACKEND = import.meta.env.VITE_URL_BACKEND;

const toArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map(String);

  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return [];
    // separa si viene como "A, B; C | D"
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

const toNumber = (value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return 0;

    // Soporta "8.737" (como miles) y "8,737" (decimal)
    // Si tu input "8.737" significa 8.737 (decimal), elimina el replace(/\./g,"")
    const normalized = s.replace(/\./g, "").replace(",", ".");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  }

  return 0;
};

export const normalizeProyecto = (raw) => ({
  id: raw["N°"] ?? raw.id ?? crypto.randomUUID(),
  nombre: raw["Nombre Proyecto/Perfil Proyecto"] ?? "",
  tematica: raw["Temática"] ?? null,
  estatus: raw["Estatus"] ?? null,
  unidad: raw["Unidad Académica"] ?? null,
  unidadesPlus: toArray(raw["Unidad Académica ++"]),
  institucion: raw["Institucion Convocatoria"] ?? null,
  tipoConvocatoria: raw["Tipo Convocatoria"] ?? null,
  montoMM: toNumber(raw["Monto Proyecto MM$"]),
  lideres: toArray(raw["Académic@/s-Líder"]),
  partners: toArray(raw["Académic@/s-Partner"]),
  estudiantes: toArray(raw["Estudiantes"]),
  validar:
    String(raw["VALIDAR"] ?? "")
      .trim()
      .toUpperCase() === "TRUE",
});

export const groupCountBy = (items, getKey) => {
  const map = new Map();
  for (const it of items) {
    const key = getKey(it);
    if (!key) continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
};

export const buildProyectosPorProfesor = (items) => {
  const map = new Map();

  for (const p of items) {
    const personas = [...(p.lideres ?? []), ...(p.partners ?? [])];
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

export const buildProfesoresPorUnidad = (items) => {
  // Conteo de profesores únicos por unidad (basado en líderes+partners)
  const map = new Map();

  for (const p of items) {
    const unidad = p.unidad;
    if (!unidad) continue;

    const personas = new Set(
      [...(p.lideres ?? []), ...(p.partners ?? [])].map((x) => String(x).trim())
    );

    if (!map.has(unidad)) map.set(unidad, new Set());
    const set = map.get(unidad);

    for (const per of personas) {
      if (per) set.add(per);
    }
  }

  return Array.from(map.entries()).map(([UnidadAcademica, set]) => ({
    UnidadAcademica,
    NumeroDeProfesores: set.size,
  }));
};

export async function fetchProyectosFromBackend() {
  if (!VITE_URL_BACKEND) {
    throw new Error("VITE_URL_BACKEND no está definido en el .env");
  }

  const res = await fetch(VITE_URL_BACKEND, { method: "GET" });
  if (!res.ok) throw new Error(`Error backend HTTP ${res.status}`);

  const raw = await res.json();
  const list = Array.isArray(raw) ? raw : raw.data;

  if (!Array.isArray(list)) {
    throw new Error("El backend no devolvió un arreglo ni { data: [] }");
  }

  return list.map(normalizeProyecto);
}
