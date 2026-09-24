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
      // The app's palette, as CSS variables so a game's theme can swap it
      // (values per theme in index.css, list in shared/themes.ts). The
      // Original theme is warm dark plum with a cool cyan accent. Team colors
      // stay separate (shared/teamColors.ts).
      colors: {
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        tile: "rgb(var(--color-tile) / <alpha-value>)",
        accent: "rgb(var(--color-accent) / <alpha-value>)",
        // Background gradient end, and the lobby's glows.
        deep: "rgb(var(--color-deep) / <alpha-value>)",
        glow: "rgb(var(--color-glow) / <alpha-value>)",
        flare: "rgb(var(--color-flare) / <alpha-value>)",
        flare2: "rgb(var(--color-flare2) / <alpha-value>)",
        // Double Jeopardy's own look, per theme: board background, category
        // headers, tiles, tile numbers, and the TV backdrop gradient.
        "dj-ink": "rgb(var(--color-dj-ink) / <alpha-value>)",
        "dj-surface": "rgb(var(--color-dj-surface) / <alpha-value>)",
        "dj-tile": "rgb(var(--color-dj-tile) / <alpha-value>)",
        "dj-accent": "rgb(var(--color-dj-accent) / <alpha-value>)",
        "dj-from": "rgb(var(--color-dj-from) / <alpha-value>)",
        "dj-via": "rgb(var(--color-dj-via) / <alpha-value>)",
        "dj-to": "rgb(var(--color-dj-to) / <alpha-value>)",
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
        // End-of-game confetti: each piece falls the full screen height
        // while spinning (GameOverScreen sets its delay/duration/position).
        "confetti-fall": {
          "0%": { transform: "translateY(-10vh) rotate(0deg)", opacity: "1" },
          "100%": { transform: "translateY(110vh) rotate(720deg)", opacity: "0.8" },
        },
        // A picked tile grows from its spot on the board into the middle
        // while flipping over like a card (Display's tile-pick card, which sets
        // the --zoom-* start offsets; without them it grows from a small card
        // in the middle), holds, then fades to the question. Every frame
        // lists the same transform functions in the same order so the browser
        // interpolates the flip (perspective keeps it 3D).
        "tile-zoom": {
          "0%": {
            transform:
              "perspective(1200px) translate(var(--zoom-x, 0px), var(--zoom-y, 0px)) rotateY(180deg) scale(var(--zoom-sx, 0.3), var(--zoom-sy, 0.3))",
          },
          "35%": { transform: "perspective(1200px) translate(0, 0) rotateY(0deg) scale(1, 1)" },
          "85%": { opacity: "1", transform: "perspective(1200px) translate(0, 0) rotateY(0deg) scale(1, 1)" },
          "100%": { opacity: "0", transform: "perspective(1200px) translate(0, 0) rotateY(0deg) scale(1, 1)" },
        },
        "winner-pop": {
          "0%": { opacity: "0", transform: "scale(0.6)" },
          "60%": { opacity: "1", transform: "scale(1.08)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        "gentle-bounce": "gentle-bounce 3s ease-in-out infinite",
        "fade-in": "fade-in 2s ease-in",
        "dj-reveal": "dj-reveal 2.6s ease-out forwards",
        "flip-in": "flip-in 0.5s ease-out",
        strike: "strike 1.3s ease-out forwards",
        "confetti-fall": "confetti-fall 4s linear infinite",
        "winner-pop": "winner-pop 0.9s ease-out both",
        "tile-zoom": "tile-zoom 1.8s ease-in-out forwards",
        // Board category intro: each header flips down in turn (GameBoard
        // sets the delay); "both" keeps it hidden until its turn.
        "category-intro": "flip-in 0.6s ease-out both",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
