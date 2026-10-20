import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "ink-green": "#1F2E27",
        paper: "#F4F6F3",
        "brass-gold": "#A87D26",
        "chalk-teal": "#2E6656",
        "red-ink": "#A93327",
        "card-surface": "#FFFFFF",
        "topbar-green": "#1F2E27",
      },
      fontFamily: {
        display: ["var(--font-display)", "'Plus Jakarta Sans'", "sans-serif"],
        body: ["var(--font-body)", "'Inter'", "sans-serif"],
        sans: ["var(--font-body)", "'Inter'", "sans-serif"],
      },
      boxShadow: {
        card: "0 2px 16px 0 rgba(31,46,39,0.08)",
        "card-hover": "0 8px 32px 0 rgba(31,46,39,0.12)",
        nav: "0 2px 12px 0 rgba(31,46,39,0.06)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out forwards",
        "slide-up": "slideUp 0.5s ease-out forwards",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
