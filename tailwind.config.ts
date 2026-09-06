import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        black: "#0D0D0C",
        "black-soft": "#171614",
        background: "#F7F4EE",
        surface: "#FFFFFF",
        gold: "#C9A64A",
        "gold-light": "#E5D09A",
        text: "#2B2B2B",
        "text-muted": "#77736A",
        border: "#E8E2D6",
        "status-open": "#5CB85C",
      },
    },
  },
  plugins: [],
};
export default config;
