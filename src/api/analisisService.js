// src/api/analisisService.js
const VITE_URL_ANALISIS = import.meta.env.VITE_URL_ANALISIS;

const analisisService = {
  getAnalisisProyectos: async () => {
    try {
      if (!VITE_URL_ANALISIS) {
        throw new Error(
          "VITE_URL_ANALISIS no está definido en las variables de entorno."
        );
      }
      const response = await fetch(VITE_URL_ANALISIS);
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error al obtener el análisis de proyectos:", error);
      throw error;
    }
  },
};

export default analisisService;
