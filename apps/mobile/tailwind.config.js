// apps/mobile/tailwind.config.js — NativeWind v4 (Tailwind CSS 3.4)
// Espejo 1:1 de las variables y estilos de texto del archivo de Figma
// "Oficio · MVP Servicios del Hogar". Si cambias un token, cámbialo en los dos lados.

const rgb = (name) => `rgb(var(--color-${name}) / <alpha-value>)`;
const colorNames = [
  'background', 'card', 'foreground', 'muted-foreground', 'border',
  'primary', 'primary-foreground', 'primary-soft', 'primary-light',
  'accent', 'accent-soft',
  'success', 'success-soft', 'warning', 'warning-soft', 'danger', 'danger-soft',
  'map', 'map-line',
  'avatar-1', 'avatar-1-foreground', 'avatar-2', 'avatar-2-foreground',
  'avatar-3', 'avatar-3-foreground', 'avatar-4', 'avatar-4-foreground',
];

/** @type {import('tailwindcss').Config} */
module.exports = {
  // La app solo tiene tema claro. 'class' (en vez de 'media', el valor por omisión) evita el error
  // "Cannot manually set color scheme" de NativeWind en la versión web (npx expo start --web).
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: Object.fromEntries(colorNames.map((n) => [n, rgb(n)])),

      // En React Native cada peso es una familia distinta (no basta font-bold).
      // Cargar con @expo-google-fonts/{bricolage-grotesque,figtree,jetbrains-mono}.
      fontFamily: {
        display: ['BricolageGrotesque_700Bold'],          // heading/*
        'display-extrabold': ['BricolageGrotesque_800ExtraBold'], // display/3xl, logo
        sans: ['Figtree_400Regular'],                     // body/base, body/sm
        'sans-medium': ['Figtree_500Medium'],             // caption/xs
        'sans-semibold': ['Figtree_600SemiBold'],         // *-semibold
        'sans-bold': ['Figtree_700Bold'],                 // *-bold
        mono: ['JetBrainsMono_700Bold'],                  // mono/2xl (OTP)
      },

      // Tamaños = escala por defecto de Tailwind; solo se ajusta el interlineado
      // de los títulos para que coincida con los estilos de texto de Figma.
      fontSize: {
        lg: ['18px', '24px'],                             // heading/lg
        xl: ['20px', '26px'],                             // heading/xl
        '2xl': ['24px', '30px'],                          // heading/2xl
        '3xl': ['30px', '36px'],                          // display/3xl
      },

      // Espaciado y radios usan la escala por defecto (1 = 4px; rounded-xl = 12px,
      // rounded-2xl = 16px). Solo se agregan los dos tamaños que usa el diseño:
      spacing: {
        15: '60px',                                       // CategoryTile (size-15)
        18: '72px',                                       // Thumbnail (size-18)
      },
    },
  },
  plugins: [],
};
