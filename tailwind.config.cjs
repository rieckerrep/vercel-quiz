/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: "media", // oder "class"
  theme: {
    extend: {
      colors: {
        brandBlack: '#000000',
        brandWhite: '#FFFFFF',
        grayDark: '#333333',
        grayLight: '#CCCCCC',
        lightBg: '#F5F5F5',
        accentBlue: '#0066CC',
        accentBlueLight: '#0088FF',
        gold: '#FFD700'
      },
      spacing: {
        600: "600px",
        30: "7.5rem",
      },
      minHeight: {
        600: "600px",
      },
      borderRadius: {
        md: "0.5rem",
        lg: "0.75rem",
      },
      boxShadow: {
        "outline-black": "0 0 0 2px #000",
      },
      fontFamily: {
        sans: ["Cambria", "serif"],
      },
      borderWidth: {
        3: "3px",
      },
      keyframes: {
        reward: {
          '0%': { 
            opacity: '0',
            transform: 'translate(-50%, -50%) scale(0.5)'
          },
          '20%': {
            opacity: '1',
            transform: 'translate(-50%, -50%) scale(1.2)'
          },
          '40%': {
            transform: 'translate(-50%, -50%) scale(1)'
          },
          '80%': {
            opacity: '1',
            transform: 'translate(-50%, -50%) scale(1)'
          },
          '100%': {
            opacity: '0',
            transform: 'translate(-50%, -50%) scale(0.8)'
          }
        }
      },
      animation: {
        'reward': 'reward 1.5s ease-in-out forwards'
      }
    },
  },
  plugins: [],
};
