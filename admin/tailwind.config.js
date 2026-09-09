/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        'admin-bg': 'var(--bg-main)',
        'admin-card': 'var(--bg-card)',
        'admin-subtle': 'var(--bg-subtle)',
        'admin-hover': 'var(--bg-hover)',
        'admin-text-primary': 'var(--text-primary)',
        'admin-text-secondary': 'var(--text-secondary)',
        'admin-text-muted': 'var(--text-muted)',
        'admin-text-disabled': 'var(--text-disabled)',
        'admin-border': 'var(--border-color)',
        'admin-border-subtle': 'var(--border-subtle)',
        'admin-accent': {
          DEFAULT: 'var(--accent-primary)',
          hover: 'var(--accent-hover)',
          light: 'var(--accent-light)',
        },
        'admin-success': 'var(--color-success)',
        'admin-warning': 'var(--color-warning)',
        'admin-danger': 'var(--color-danger)',
        'admin-info': 'var(--color-info)',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        'admin-sm': 'var(--shadow-sm)',
        'admin-md': 'var(--shadow-md)',
        'admin-lg': 'var(--shadow-lg)',
      },
      borderRadius: {
        'admin-xs': 'var(--radius-xs)',
        'admin-sm': 'var(--radius-sm)',
        'admin-md': 'var(--radius-md)',
        'admin-lg': 'var(--radius-lg)',
      },
      keyframes: {
        fadeInOverlay: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideInRight: {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
      },
      animation: {
        'drawer-overlay': 'fadeInOverlay 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'drawer-content': 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
    },
  },
  plugins: [],
};
