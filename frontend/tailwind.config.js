/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#800020',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#D4AF37',
          foreground: '#1A1A1A',
        },
        background: '#FDFBF7',
        foreground: '#1A1A1A',
        muted: {
          DEFAULT: '#F5F0E6',
          foreground: '#666666',
        },
        border: '#E6E0D4',
        accent: {
          DEFAULT: '#F9F5EB',
          foreground: '#800020',
        },
      },
      fontFamily: {
        heading: ['Playfair Display', 'serif'],
        body: ['Manrope', 'sans-serif'],
        accent: ['Cormorant Garamond', 'serif'],
      },
      borderRadius: {
        lg: '0.25rem',
        md: '0.25rem',
        sm: '0.125rem',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}