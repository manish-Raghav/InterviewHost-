/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#ECEFF3',
        ink: { DEFAULT: '#16202F', soft: '#223047' },
        muted: '#5A6577',
        line: '#D3D9E2',
        signal: { DEFAULT: '#0E7C7B', dark: '#0A5F5E', soft: '#DBF0EE' },
        amber: { DEFAULT: '#B7791F', soft: '#FBEFD5' },
        rose: { DEFAULT: '#B42340', soft: '#FBE3E8' },
        editor: '#0F1724',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
