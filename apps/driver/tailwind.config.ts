import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#060910",
        surface: "#0f172a",
        "surface-border": "#1e293b",
        hud: {
          green: "#22c55e",
          amber: "#f59e0b",
          red: "#ef4444",
          cyan: "#06b6d4"
        }
      }
    }
  },
  plugins: []
};
export default config;
