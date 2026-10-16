/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Outfit", "sans-serif"],
        outfit: ["Outfit", "sans-serif"],
      },
      colors: {
        background: "#181818",
        card: "#232323",
        "muted-text": "#9A9A9A",
        text: "#FFFFFF",
        "accent-lime": "#D5F737",
        olive: "#5A632B",
        "dim-bar": "#404040",
        // Extended mapping for shadcn/ui & Magic UI compatibility
        border: "rgba(255, 255, 255, 0.10)",
        input: "rgba(255, 255, 255, 0.10)",
        ring: "#D5F737",
        foreground: "#FFFFFF",
        primary: {
          DEFAULT: "#D5F737",
          foreground: "#181818",
        },
        secondary: {
          DEFAULT: "#232323",
          foreground: "#FFFFFF",
        },
        destructive: {
          DEFAULT: "#EF4444",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#232323",
          foreground: "#9A9A9A",
        },
        accent: {
          DEFAULT: "#D5F737",
          foreground: "#181818",
        },
        popover: {
          DEFAULT: "#232323",
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
