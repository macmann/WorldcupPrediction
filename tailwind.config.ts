import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        pitch: { 50: "#f0fdf4", 500: "#22c55e", 900: "#052e16" },
        navy: "#06142e"
      },
      boxShadow: { card: "0 16px 40px rgba(6, 20, 46, 0.14)" }
    }
  },
  plugins: []
};
export default config;
