/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./assets/js/*.js"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        night: {
          bg: '#0B0F19',
          card: '#151C2C',
        },
        gold: {
          primary: '#F59E0B',
        },
        sunset: {
          orange: '#EA580C',
          purple: '#7C3AED',
        }
      },
      backgroundImage: {
        'gradient-sunset': 'linear-gradient(135deg, #F59E0B 0%, #EA580C 50%, #7C3AED 100%)',
        'gradient-gold-sunset': 'linear-gradient(90deg, #F59E0B 0%, #EA580C 100%)',
      }
    },
  },
  plugins: [],
}
