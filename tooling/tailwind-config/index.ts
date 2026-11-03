import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["src/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1280px" },
    },
    extend: {
      colors: {
        forest: {
          DEFAULT: "#2B4C3B",
          700: "#1E3A2C",
          50: "#EEF4EF",
        },
        sage: {
          DEFAULT: "#C2D5C4",
          300: "#D6E4D7",
          600: "#8FAE93",
        },
        cream: {
          DEFAULT: "#FDF0D5",
          card: "#FFFBF1",
          line: "#D9D2BC",
        },
        paper: "#FFFBF1",
        ink: {
          DEFAULT: "#1E2B24",
          muted: "#55655B",
        },
        status: {
          done: { solid: "#4FB286", soft: "#DDF1E6", text: "#1F6B4A" },
          doing: { solid: "#E8B84A", soft: "#FBEFC8", text: "#7A5A00" },
          blocked: { solid: "#D9626B", soft: "#F8DADD", text: "#9B2C36" },
          idle: { solid: "#9AA89F", soft: "#E6EBE6", text: "#3E4A43" },
          review: { solid: "#6E9AA8", soft: "#DCEAEF", text: "#2C5563" },
        },
        background: "#FDF0D5",
        foreground: "#1E2B24",
        border: "#D9D2BC",
        input: "#D9D2BC",
        ring: "#2B4C3B",
        muted: "#E6EBE6",
        "muted-foreground": "#55655B",
        card: "#FFFBF1",
        "card-foreground": "#1E2B24",
        primary: { DEFAULT: "#2B4C3B", foreground: "#FFFBF1" },
        secondary: { DEFAULT: "#C2D5C4", foreground: "#1E2B24" },
        destructive: { DEFAULT: "#D9626B", foreground: "#FFFBF1" },
        accent: { DEFAULT: "#EEF4EF", foreground: "#1E2B24" },
        popover: { DEFAULT: "#FFFBF1", foreground: "#1E2B24" },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
        heading: [
          "Plus Jakarta Sans",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        card: "12px",
        lg: "8px",
        md: "8px",
        sm: "4px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(30, 43, 36, 0.06)",
        pop: "0 12px 32px -12px rgba(30, 43, 36, 0.25)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.18s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
