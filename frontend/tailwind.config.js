/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        card: {
          DEFAULT: "var(--card)",
          muted: "var(--card-2)",
        },
        line: {
          DEFAULT: "var(--line)",
          strong: "var(--line-strong)",
        },
        ink: {
          DEFAULT: "var(--ink)",
          muted: "var(--ink-muted)",
          faint: "var(--ink-faint)",
        },
        ember: {
          DEFAULT: "var(--ember)",
          hover: "var(--ember-hover)",
          weak: "var(--ember-weak)",
          "weak-border": "var(--ember-weak-border)",
          ink: "var(--ember-ink)",
        },
        ok: {
          DEFAULT: "var(--ok)",
          weak: "var(--ok-weak)",
          "weak-border": "var(--ok-weak-border)",
        },
        bad: {
          DEFAULT: "var(--bad)",
          weak: "var(--bad-weak)",
          "weak-border": "var(--bad-weak-border)",
        },
      },
      borderRadius: {
        control: "var(--r-control)",
        card: "var(--r-card)",
      },
      boxShadow: {
        card: "0 1px 2px rgba(28,25,23,0.04), 0 14px 30px -20px rgba(28,25,23,0.20)",
        pop: "0 10px 34px -12px rgba(28,25,23,0.24)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      maxWidth: {
        prose: "68ch",
      },
    },
  },
  plugins: [],
};
