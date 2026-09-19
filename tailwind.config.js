/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // Match React components
  ],
  theme: {
    extend: {
      // Outfit: a rounded geometric sans that stays legible at a distance
      // without needing heavy weights.
      fontFamily: {
        sans: ['"Outfit"', "ui-sans-serif", "system-ui", "sans-serif"],
        display: ['"Outfit"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      // The app's own palette: warm dark plum surfaces with a cool cyan
      // accent (team colors stay separate, see shared/teamColors.ts).
      colors: {
        ink: "#120e26",
        surface: "#1f1a40",
        tile: "#2c2660",
        accent: "#67e8f9",
      },
      // TitlePage (and the Double Jeopardy reveal) reference these by name;
      // without definitions here Tailwind silently generated nothing for them.
      keyframes: {
        "gentle-bounce": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "flip-in": {
          "0%": { transform: "rotateX(90deg)", opacity: "0" },
          "100%": { transform: "rotateX(0)", opacity: "1" },
        },
        strike: {
          "0%": { opacity: "0", transform: "scale(0.4)" },
          "15%": { opacity: "1", transform: "scale(1.05)" },
          "70%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        "dj-reveal": {
          "0%": { opacity: "0", transform: "scale(0.6)" },
          "15%": { opacity: "1", transform: "scale(1.1)" },
          "25%": { transform: "scale(1)" },
          "85%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
      },
      animation: {
        "gentle-bounce": "gentle-bounce 3s ease-in-out infinite",
        "fade-in": "fade-in 2s ease-in",
        "dj-reveal": "dj-reveal 2.6s ease-out forwards",
        "flip-in": "flip-in 0.5s ease-out",
        strike: "strike 1.3s ease-out forwards",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
