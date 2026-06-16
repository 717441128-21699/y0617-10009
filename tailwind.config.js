/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        catppuccin: {
          base: "#1e1e2e",
          mantle: "#181825",
          crust: "#11111b",
          surface0: "#313244",
          surface1: "#45475a",
          surface2: "#585b70",
          text: "#cdd6f4",
          subtext0: "#a6adc8",
          subtext1: "#bac2de",
          overlay0: "#6c7086",
          green: "#a6e3a1",
          greenIntense: "#22c55e",
          red: "#f38ba8",
          redIntense: "#ef4444",
          mauve: "#cba6f7",
          pink: "#f5c2e7",
          blue: "#89b4fa",
          yellow: "#f9e2af",
          peach: "#fab387",
        },
      },
      fontFamily: {
        mono: [
          "JetBrains Mono",
          "Fira Code",
          "SF Mono",
          "Consolas",
          "Liberation Mono",
          "Menlo",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};
