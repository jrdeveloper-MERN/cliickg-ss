/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/providers/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/contexts/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "var(--color-primary, #023C23)",
          hover: "var(--color-primary-hover, #012b19)",
          light: "var(--color-primary-light, #f0fdf4)",
          border: "var(--color-primary-border, #bbf7d0)",
        },
        secondary: {
          DEFAULT: "var(--color-secondary, #F6C72A)",
          hover: "var(--color-secondary-hover, #e5b61b)",
        },
        accent: {
          gold: "#c9a84c",
          "gold-dark": "#a18231",
        },
        maroon: {
          dark: "#581c27",
          deep: "#3e121a",
        },
        emerald: {
          brand: "#064e3b",
          "brand-dark": "#022c22",
        },
        navy: {
          dark: "#0f172a",
        },
        bg: {
          light: "#faf7f8",
          white: "#ffffff",
        },
        surface: {
          light: "#faf7f8",
        },
        brand: {
          text: "#1e293b",
          muted: "#64748b",
          border: "#e2e8f0",
        },
      },
      fontFamily: {
        sans: ["Outfit", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        serif: ["ivymode", "Cormorant Garamond", "Tenor Sans", "Playfair Display", "serif"],
      },
      boxShadow: {
        'brand-sm': '0 1px 3px rgba(0, 0, 0, 0.05)',
        'brand-md': '0 4px 12px -2px rgba(2, 60, 35, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'brand-lg': '0 10px 25px -5px rgba(2, 60, 35, 0.15)',
        'btn-gold': '0 3px 8px rgba(201, 168, 76, 0.25)',
        'btn-primary': '0 3px 8px rgba(2, 60, 35, 0.2)',
      },
      borderRadius: {
        'brand-sm': '4px',
        'brand-md': '8px',
        'brand-lg': '12px',
        'brand-xl': '16px',
      },
      keyframes: {
        mobileDrawerFadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        mobileDrawerSlideIn: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        megaMenuFadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideLeft: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'drawer-fade': 'mobileDrawerFadeIn 250ms ease-out forwards',
        'drawer-slide': 'mobileDrawerSlideIn 250ms ease-out forwards',
        'mega-menu': 'megaMenuFadeIn 0.22s ease-out forwards',
        'slide-left': 'slideLeft 0.3s ease-out forwards',
        'fade-in': 'fadeIn 0.25s ease-out forwards',
      },
      screens: {
        xs: '480px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      },
    },
  },
  plugins: [],
};
