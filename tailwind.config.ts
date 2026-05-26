import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-bricolage)", "system-ui", "sans-serif"],
        serif: ["var(--font-instrument)", "serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      colors: {
        ink: "#08070a",
        snow: "#f5f5f7",
        surface: "#0f0e13",
        muted: "#a1a1aa",
        bingo: "#ff6b00",
        reals: "#a78bfa",
        success: "#22c55e",
        warning: "#f59e0b",
        danger: "#ef4444",
      },
      backgroundImage: {
        "bingo-gradient":
          "linear-gradient(135deg, #ff8a3c 0%, #ff6b00 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
