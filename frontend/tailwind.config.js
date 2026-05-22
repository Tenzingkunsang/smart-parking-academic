/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        prodmax: {
          bg: '#050505',
          cyan: '#00F2FF',
          blue: '#0055FF',
          orange: '#FF5E00',
          glass: 'rgba(255, 255, 255, 0.03)',
          glassBorder: 'rgba(255, 255, 255, 0.08)',
          text: '#FFFFFF',
          textDim: '#A0A0A0'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
      },
      animation: {
        'blob': 'blob 7s infinite',
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: 1, transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(0, 242, 255, 0.7)' },
          '50%': { opacity: .8, transform: 'scale(1.05)', boxShadow: '0 0 20px 10px rgba(0, 242, 255, 0)' },
        }
      }
    },
  },
  plugins: [],
}
