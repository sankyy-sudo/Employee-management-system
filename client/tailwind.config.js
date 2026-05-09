export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      colors: {
        canvas: "#F8FAFC",
        card: "#FFFFFF",
        primary: "#2563EB",
        ink: "#0F172A",
        muted: "#64748B",
        line: "#E2E8F0",
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444"
      },
      boxShadow: {
        soft: "0 16px 40px rgba(15, 23, 42, 0.08)",
        lift: "0 24px 60px rgba(15, 23, 42, 0.12)"
      }
    },
  },
  plugins: [],
}

