import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--ink)",
        paper: "var(--paper)",
        card: "var(--card)",
        muted: "var(--muted)",
        line: "var(--line)",
        brand: {
          DEFAULT: "var(--brand)",
          soft: "var(--brand-soft)",
        },
        accent: "var(--accent)",
        protein: "var(--protein)",
        carbs: "var(--carbs)",
        fat: "var(--fat)",
        fibre: "var(--fibre)",
      },
      borderRadius: {
        card: "20px",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
