// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import autoprefixer from "autoprefixer";
import tailwindcss from "tailwindcss"; // <-- IMPORTACIÓN PARA TAILWIND V3 (es el paquete 'tailwindcss' sin '@')
import path from "path"; // Para los alias de ruta

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [
        // Orden crucial: tailwindcss DEBE ir antes que autoprefixer.
        // Aquí se pasa directamente el módulo tailwindcss.
        tailwindcss(), // <-- USO PARA TAILWIND V3
        autoprefixer(),
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
