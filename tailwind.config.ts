import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0a0a0a",
        bone: "#f4ede1",
        chalk: "#fef189",
        chalkInk: "#9a7b00",
        flare: "#fc3b2c",
        sky: "#e7f1ff",
        skyInk: "#101733",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "EB Garamond", "Georgia", "serif"],
        script: ["var(--font-script)", "Pinyon Script", "Snell Roundhand", "cursive"],
      },
      maxWidth: {
        column: "700px",
      },
    },
  },
  plugins: [],
} satisfies Config;
