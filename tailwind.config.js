/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        charcoal: "#050506",
        ivory: "#f7f3ea",
        accent: "#c8a96c"
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', '"Noto Sans JP"', "system-ui", "-apple-system", "serif"]
      }
    }
  },
  plugins: []
};
