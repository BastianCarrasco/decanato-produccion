import axios from "axios";
//console.log("BASE_URL loaded:", import.meta.env.VITE_API_BASE_URL);
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const axiosClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    // Puedes agregar otros headers globales aquí, como tokens de autorización si tu API los requiere:
    // 'Authorization': `Bearer ${localStorage.getItem('token')}`
  },
  timeout: 10000, // Tiempo de espera para las peticiones (10 segundos)
});

// Opcional: Interceptores de respuesta para manejar errores globalmente
axiosClient.interceptors.response.use(
  (response) => response, // Si la respuesta es exitosa, la retorna directamente
  (error) => {
    // Manejo global de errores HTTP
    if (error.response) {
      // El servidor respondió con un status fuera del rango 2xx
      console.error(
        "Error de API:",
        error.response.status,
        error.response.data
      );
      // Puedes redirigir al login si es 401, mostrar un toast de error, etc.
      // if (error.response.status === 401) {
      //   window.location.href = '/login';
      // }
    } else if (error.request) {
      // La petición fue hecha pero no se recibió respuesta (ej. red caída)
      console.error("No se recibió respuesta del servidor:", error.request);
    } else {
      // Algo pasó al configurar la petición que provocó un error
      console.error("Error al configurar la petición:", error.message);
    }
    return Promise.reject(error); // Rechaza la promesa para que el componente que llamó pueda manejarlo
  }
);

export default axiosClient;
