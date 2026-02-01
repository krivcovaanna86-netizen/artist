/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'tg-bg': 'var(--tg-theme-bg-color, #ffffff)',
        'tg-text': 'var(--tg-theme-text-color, #000000)',
        'tg-hint': 'var(--tg-theme-hint-color, #999999)',
        'tg-link': 'var(--tg-theme-link-color, #2481cc)',
        'tg-button': 'var(--tg-theme-button-color, #2481cc)',
        'tg-button-text': 'var(--tg-theme-button-text-color, #ffffff)',
        'tg-secondary-bg': 'var(--tg-theme-secondary-bg-color, #f0f0f0)',
        'tg-header-bg': 'var(--tg-theme-header-bg-color, #ffffff)',
        'tg-accent': 'var(--tg-theme-accent-text-color, #2481cc)',
        'tg-section-bg': 'var(--tg-theme-section-bg-color, #ffffff)',
        'tg-section-header': 'var(--tg-theme-section-header-text-color, #999999)',
        'tg-subtitle': 'var(--tg-theme-subtitle-text-color, #999999)',
        'tg-destructive': 'var(--tg-theme-destructive-text-color, #ff3b30)',
      },
      fontFamily: {
        'sans': ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
