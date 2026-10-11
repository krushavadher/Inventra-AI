/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./client/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Outfit", "sans-serif"],
        outfit: ["Outfit", "sans-serif"],
      },
      colors: {
        background: "#161616",
        card: "#1E1E1E",
        "muted-text": "#9A9A9A",
        text: "#FFFFFF",
        "accent-lime": "#C6F135",
        // Extended mapping for shadcn/ui & Magic UI compatibility
        border: "rgba(255, 255, 255, 0.12)",
        input: "rgba(255, 255, 255, 0.15)",
        ring: "#C6F135",
        foreground: "#FFFFFF",
        primary: {
          DEFAULT: "#C6F135",
          foreground: "#161616",
        },
        secondary: {
          DEFAULT: "#1E1E1E",
          foreground: "#FFFFFF",
        },
        destructive: {
          DEFAULT: "#EF4444",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#1E1E1E",
          foreground: "#9A9A9A",
        },
        accent: {
          DEFAULT: "#C6F135",
          foreground: "#161616",
        },
        popover: {
          DEFAULT: "#1E1E1E",
          foreground: "#FFFFFF",
        },
      },
      borderRadius: {
        lg: "24px",
        md: "16px",
        sm: "12px",
      },
      animation: {
        "border-beam": "border-beam calc(var(--duration)*1s) infinite linear",
        "shimmer-slide": "shimmer-slide var(--speed) ease-in-out infinite alternate",
        "spin-around": "spin-around calc(var(--speed) * 2) infinite linear",
        grid: "grid 15s linear infinite",
      },
      keyframes: {
        "border-beam": {
          "100%": {
            "offset-distance": "100%",
          },
        },
        "shimmer-slide": {
          to: {
            transform: "translate(calc(100cqw - 100%), 0)",
          },
        },
        "spin-around": {
          "0%": {
            transform: "translateZ(0) rotate(0)",
          },
          "15%, 35%": {
            transform: "translateZ(0) rotate(90deg)",
          },
          "65%, 85%": {
            transform: "translateZ(0) rotate(270deg)",
          },
          "100%": {
            transform: "translateZ(0) rotate(360deg)",
          },
        },
        grid: {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(calc(var(--cell-size, 60px) * -1))" },
        },
      },
    },
  },
  plugins: [],
};
