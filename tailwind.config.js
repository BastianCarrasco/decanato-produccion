/** @type {import('tailwindcss').Config} */
const colors = require('tailwindcss/colors'); // Importa los colores por defecto de Tailwind

module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}", // Ajusta según tu estructura
    "./public/index.html",
  ],
  theme: {
    // Definimos los colores principales de tu tema aquí, directamente bajo `theme`.
    // NO uses `extend.colors` para estos, ya que `colors` por sí solo sobrescribe la paleta por defecto.
    colors: {
      // --- COLORES BASE DE TU TEMA (SHADCN) ---
      // Estos deben coincidir con tus variables CSS en `:root` y `.dark` de `index.css`.
      // La sintaxis `hsl(var(--nombre))` es estándar de Shadcn para theming.
      background: "hsl(var(--background))",
      foreground: "hsl(var(--foreground))",
      card: "hsl(var(--card))",
      "card-foreground": "hsl(var(--card-foreground))",
      popover: "hsl(var(--popover))",
      "popover-foreground": "hsl(var(--popover-foreground))",
      primary: "hsl(var(--primary))",
      "primary-foreground": "hsl(var(--primary-foreground))",
      secondary: "hsl(var(--secondary))",
      "secondary-foreground": "hsl(var(--secondary-foreground))",
      muted: "hsl(var(--muted))",
      "muted-foreground": "hsl(var(--muted-foreground))",
      accent: "hsl(var(--accent))",
      "accent-foreground": "hsl(var(--accent-foreground))",
      destructive: "hsl(var(--destructive))",
      "destructive-foreground": "hsl(var(--destructive-foreground))", // Asegúrate de tener esta variable en CSS
      border: "hsl(var(--border))",
      input: "hsl(var(--input))",
      ring: "hsl(var(--ring))",

      // Colores de los gráficos
      "chart-1": "hsl(var(--chart-1))",
      "chart-2": "hsl(var(--chart-2))",
      "chart-3": "hsl(var(--chart-3))",
      "chart-4": "hsl(var(--chart-4))",
      "chart-5": "hsl(var(--chart-5))",

      // Colores del sidebar
      sidebar: "hsl(var(--sidebar))",
      "sidebar-foreground": "hsl(var(--sidebar-foreground))",
      "sidebar-primary": "hsl(var(--sidebar-primary))",
      "sidebar-primary-foreground": "hsl(var(--sidebar-primary-foreground))",
      "sidebar-accent": "hsl(var(--sidebar-accent))",
      "sidebar-accent-foreground": "hsl(var(--sidebar-accent-foreground))",
      "sidebar-border": "hsl(var(--sidebar-border))",
      "sidebar-ring": "hsl(var(--sidebar-ring))",

      // --- PALETAS DE COLORES ESTÁNDAR DE TAILWIND (red, blue, gray, etc.) ---
      // Aquí fusionamos las paletas por defecto de Tailwind (ej. `colors.red`)
      // con tus personalizaciones RGB directas.
      // `...colors` incluye todas las paletas estándar de Tailwind (blue, gray, etc. con sus 50-900 tonos).
      // Luego, sobrescribimos los tonos específicos que tenías convertidos a RGB.
      ...colors, // Mantiene todas las paletas por defecto (pero usa tus RGB si los redefines abajo)

      // Aquí puedes sobrescribir los tonos específicos de cada paleta con tus valores RGB directos.
      // Estos no necesitan `hsl(var(...))` porque son valores finales.
      red: {
        ...colors.red, // Mantiene los tonos de rojo por defecto, excepto los que sobrescribes
        50: "rgb(249, 237, 235)",
        100: "rgb(254, 226, 226)",
        200: "rgb(252, 202, 202)",
        300: "rgb(252, 165, 165)",
        400: "rgb(248, 113, 113)",
        500: "rgb(239, 68, 68)",
        600: "rgb(220, 38, 38)",
        700: "rgb(185, 28, 28)",
        800: "rgb(153, 27, 27)",
        900: "rgb(127, 29, 29)",
      },
      orange: {
        ...colors.orange,
        100: "rgb(243, 238, 226)",
        500: "rgb(230, 150, 68)",
        700: "rgb(180, 115, 60)",
      },
      yellow: {
        ...colors.yellow,
        100: "rgb(250, 246, 233)",
        200: "rgb(240, 229, 196)",
        700: "rgb(185, 169, 107)",
      },
      green: {
        ...colors.green,
        100: "rgb(235, 245, 236)",
        200: "rgb(217, 230, 219)",
        500: "rgb(92, 178, 126)",
        600: "rgb(75, 149, 107)",
        700: "rgb(58, 120, 89)",
      },
      teal: {
        ...colors.teal,
        100: "rgb(235, 243, 241)",
        700: "rgb(108, 140, 137)",
      },
      cyan: {
        ...colors.cyan,
        100: "rgb(236, 243, 244)",
        700: "rgb(125, 153, 160)",
      },
      sky: {
        ...colors.sky,
        50: "rgb(240, 248, 252)", 100: "rgb(222, 239, 248)", 200: "rgb(197, 224, 242)", 300: "rgb(163, 200, 230)", 400: "rgb(120, 172, 215)", 500: "rgb(75, 142, 192)", 600: "rgb(50, 120, 166)", 700: "rgb(39, 93, 128)", 800: "rgb(30, 72, 99)", 900: "rgb(24, 58, 80)", 950: "rgb(16, 37, 51)",
      },
      blue: {
        ...colors.blue,
        50: "rgb(246, 248, 252)", 100: "rgb(238, 242, 249)", 200: "rgb(221, 229, 241)", 400: "rgb(159, 187, 225)", 500: "rgb(121, 159, 209)", 600: "rgb(90, 133, 192)", 700: "rgb(69, 108, 164)", 800: "rgb(52, 85, 129)",
      },
      purple: {
        ...colors.purple,
        100: "rgb(239, 237, 247)", 500: "rgb(148, 77, 204)", 600: "rgb(130, 68, 178)", 700: "rgb(113, 62, 149)",
      },
      slate: { // Tailwind tiene su propia paleta slate. Asegúrate de si quieres extenderla o sobrescribirla.
        ...colors.slate, // Si usas otros tonos slate por defecto
        50: "rgb(250, 251, 253)",
        100: "rgb(246, 247, 250)",
        700: "rgb(94, 98, 105)",
      },
      gray: { // Similar a slate, fusiona o sobrescribe
        ...colors.gray,
        50: "rgb(251, 251, 252)", 100: "rgb(246, 247, 249)", 200: "rgb(237, 239, 242)", 300: "rgb(223, 226, 230)", 400: "rgb(181, 184, 189)", 500: "rgb(140, 143, 148)", 600: "rgb(113, 116, 120)", 700: "rgb(94, 97, 101)", 800: "rgb(71, 74, 76)", 900: "rgb(53, 56, 58)",
      },
      black: colors.black, // Referencia directa a los colores de Tailwind
      white: colors.white, // Referencia directa a los colores de Tailwind
    },
    extend: {
      fontFamily: {
        sans: ["Lato", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  corePlugins: {
    preflight: true,
    // NO usamos customProperties: false aquí. Shadcn los necesita.
    // Tailwind v3 no generará OKLCH para `--tw-color-*`
    // Si tu problema de `oklch` era de `--tw-color-*`, v3 lo soluciona sin `customProperties: false`
    // que causa problemas con `border-border`
  },
  plugins: [],
};