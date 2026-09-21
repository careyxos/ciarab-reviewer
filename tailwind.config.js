/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        chobee: {
          pink: {
            50: '#fdf4f7',
            100: '#fbe8ef',
            200: '#f7d1df',
            300: '#f0a8c2',
            400: '#e779a1',
            500: '#db5484',
            600: '#c33b6b',
            700: '#a22c54',
          },
          rose: {
            50: '#fff1f2',
            100: '#ffe4e6',
            200: '#fecdd3',
            300: '#fda4af',
            400: '#fb7185',
            500: '#f43f5e',
            600: '#e11d48',
          },
          blue: {
            50: '#f0f7ff',
            100: '#e0effe',
            200: '#bae0fd',
            300: '#7ccbfd',
            400: '#38bdf8',
            500: '#0ea5e9',
            600: '#0284c7',
          },
          lavender: {
            50: '#faf8ff',
            100: '#f3eefe',
            200: '#e6dcfe',
            300: '#cdbafc',
            400: '#ac8ef8',
            500: '#8b5cf6',
          },
          warm: {
            50: '#faf9f6',
            100: '#f5f4ef',
            200: '#eae8e0',
            300: '#dcd9ce',
          },
          navy: {
            600: '#475569',
            700: '#334155',
            800: '#1e293b',
            900: '#0f172a',
            950: '#090d16',
          }
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Plus Jakarta Sans', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.03)',
        'card-hover': '0 8px 20px -4px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.03)',
        'soft-pink': '0 4px 14px -2px rgba(219, 84, 132, 0.16)',
        'soft-blue': '0 4px 14px -2px rgba(14, 165, 233, 0.16)',
        'glow-dual': '0 4px 20px -2px rgba(219, 84, 132, 0.12), 0 4px 20px -2px rgba(14, 165, 233, 0.10)',
      },
      animation: {
        'float-gentle': 'floatGentle 3s ease-in-out infinite',
      },
      keyframes: {
        floatGentle: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-3px)' },
        }
      }
    },
  },
  plugins: [],
}
