import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef9ff",
          100: "#d7f0ff",
          200: "#b7e5ff",
          300: "#85d4ff",
          400: "#49b8ff",
          500: "#1597f3",
          600: "#006fcb",
          700: "#0056a0",
          800: "#07457e",
          900: "#0b3a69"
        },
        health: {
          mint: "#dff8eb",
          teal: "#1f8b72",
          forest: "#0d5f50"
        }
      },
      backgroundImage: {
        "medical-grid": "linear-gradient(to right, rgba(21, 151, 243, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(21, 151, 243, 0.08) 1px, transparent 1px)",
        "hero-radial": "radial-gradient(circle at top left, rgba(73, 184, 255, 0.22), transparent 35%), radial-gradient(circle at 80% 10%, rgba(31, 139, 114, 0.22), transparent 30%)"
      },
      boxShadow: {
        panel: "0 18px 60px rgba(12, 49, 79, 0.12)"
      },
      borderRadius: {
        "4xl": "2rem"
      }
    }
  },
  plugins: []
};

export default config;
