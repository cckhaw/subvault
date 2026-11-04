/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: "jit",
  darkMode: "media",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: { DEFAULT: "#F5F5F7", dark: "#000000" },
        elevated: { dark: "#1C1C1E" },
        sys: {
          blue: "#007AFF",
          green: "#30D158",
          orange: "#FF9500",
          red: "#FF3B30"
        }
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Display"',
          '"SF Pro Text"',
          "system-ui",
          "sans-serif"
        ]
      },
      borderRadius: {
        card: "20px",
        btn: "12px"
      },
      boxShadow: {
        ambient: "0 10px 30px rgba(0,0,0,0.06)"
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.32, 0.72, 0, 1)"
      }
    }
  },
  plugins: []
};
