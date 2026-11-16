import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";
import plugin from "tailwindcss/plugin";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        carbon: "#090A0F",
        anthracite: "#12151E",
        oro: { DEFAULT: "#F59E0B", light: "#FBBF24" },
        ghiaccio: "#38BDF8",
        testo: "#F8FAFC",
      },
      fontFamily: {
        sans: ["var(--font-archivo)", ...defaultTheme.fontFamily.sans],
      },
      boxShadow: {
        glow: "0 10px 40px -12px rgba(245, 158, 11, 0.55)",
      },
    },
  },
  plugins: [
    plugin(({ addUtilities }) => {
      addUtilities({
        ".stretch-display": { "font-stretch": "115%" },
        ".stretch-wide": { "font-stretch": "125%" },
        ".stretch-normal": { "font-stretch": "100%" },
      });
    }),
  ],
};

export default config;
