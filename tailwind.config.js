/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        marine: {
          base: "rgb(var(--marine-base) / <alpha-value>)",
          card: "rgb(var(--marine-card) / <alpha-value>)",
          hover: "rgb(var(--marine-hover) / <alpha-value>)",
          border: "rgb(var(--marine-border) / <alpha-value>)",
          text: "rgb(var(--marine-text) / <alpha-value>)",
          muted: "rgb(var(--marine-muted) / <alpha-value>)",
          accent: "rgb(var(--marine-accent) / <alpha-value>)",
          accentHover: "rgb(var(--marine-accent-hover) / <alpha-value>)",
          dark: "rgb(var(--marine-dark) / <alpha-value>)",
          warn: "rgb(var(--marine-warn) / <alpha-value>)",
          warnHover: "rgb(var(--marine-warn-hover) / <alpha-value>)",
          success: "rgb(var(--marine-success) / <alpha-value>)",
          error: "rgb(var(--marine-error) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-down": "slideDown 0.2s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
