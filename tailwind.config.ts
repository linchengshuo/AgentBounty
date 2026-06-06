import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#101412",
        muted: "#5f6863",
        line: "#e4ebe6",
        wash: "#f6f8f5",
        ritual: "#079455",
        ritualSoft: "#e8f7ef"
      },
      boxShadow: {
        soft: "0 24px 70px rgba(16, 20, 18, 0.08)",
        inset: "inset 0 1px 0 rgba(255,255,255,0.72)"
      },
      fontFamily: {
        sans: ["Aptos", "Segoe UI Variable", "Segoe UI", "ui-sans-serif", "system-ui"],
        mono: ["Cascadia Code", "JetBrains Mono", "ui-monospace", "SFMono-Regular"]
      }
    }
  },
  plugins: []
};

export default config;
