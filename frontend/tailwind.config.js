/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'warm-beige': '#F2E8D8',
        'light-cream': '#FAF5EC',
        'soft-ivory': '#FFF9F0',
        'deep-wine': '#701C2C',
        'burgundy': '#8B2635',
        'deep-maroon': '#3D111B',
        'dark-charcoal': '#302626',
        'muted-brown': '#806D65',
        'gold': {
          DEFAULT: '#C5A059',
          light: '#E5C78A',
          dark: '#A6823C'
        },
        'soft-border': '#DECBB5',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'luxury': '0 8px 30px rgba(61, 17, 27, 0.08)',
        'luxury-lg': '0 15px 45px rgba(61, 17, 27, 0.12)',
        'glossy': 'inset 0 1px 1px rgba(255, 255, 255, 0.6), 0 4px 12px rgba(61, 17, 27, 0.15)',
        'glossy-gold': 'inset 0 1px 1px rgba(255, 255, 255, 0.7), 0 4px 12px rgba(197, 160, 89, 0.25)',
      }
    },
  },
  plugins: [],
}
