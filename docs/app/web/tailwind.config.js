/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: "#ff4600",      // laranja Colmeia
        ink: "#3a3a3a",
        sub: "#757575",
      },
    },
  },
  plugins: [],
};
