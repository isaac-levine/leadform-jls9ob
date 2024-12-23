import type { Config } from 'tailwindcss'

/**
 * Tailwind CSS configuration for AI-Driven Lead Capture & SMS Platform
 * Version: 1.0.0
 * Integrates Acetunity UI and ShadCN design systems
 */
const config: Config = {
  // Configure content paths for Tailwind processing
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}',
  ],

  // Use media queries for dark mode
  darkMode: 'media',

  // Theme customization
  theme: {
    extend: {
      // Custom color system using RGB variables for opacity control
      colors: {
        primary: {
          DEFAULT: 'rgb(var(--primary-rgb) / <alpha-value>)',
          hover: 'rgb(var(--primary-rgb) / 0.9)',
          active: 'rgb(var(--primary-rgb) / 0.8)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--secondary-rgb) / <alpha-value>)',
          hover: 'rgb(var(--secondary-rgb) / 0.9)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent-rgb) / <alpha-value>)',
          hover: 'rgb(var(--accent-rgb) / 0.9)',
        },
        success: {
          DEFAULT: 'rgb(var(--success-rgb) / <alpha-value>)',
          hover: 'rgb(var(--success-rgb) / 0.9)',
        },
        error: {
          DEFAULT: 'rgb(var(--error-rgb) / <alpha-value>)',
          hover: 'rgb(var(--error-rgb) / 0.9)',
        },
        warning: {
          DEFAULT: 'rgb(var(--warning-rgb) / <alpha-value>)',
          hover: 'rgb(var(--warning-rgb) / 0.9)',
        },
        background: 'rgb(var(--background-rgb) / <alpha-value>)',
        text: 'rgb(var(--text-rgb) / <alpha-value>)',
        border: 'rgb(var(--border-rgb) / <alpha-value>)',
      },

      // Border radius system
      borderRadius: {
        DEFAULT: '0.5rem',
        sm: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
      },

      // Spacing system
      spacing: {
        container: '2rem',
        form: '1.5rem',
        message: '1rem',
        inbox: '4rem',
        header: '4rem',
        sidebar: '16rem',
      },

      // Responsive breakpoints
      screens: {
        xs: '480px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      },

      // Typography system
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },

      // Container configurations
      container: {
        center: true,
        padding: {
          DEFAULT: '1rem',
          sm: '2rem',
          lg: '4rem',
        },
      },

      // Animation durations
      transitionDuration: {
        DEFAULT: '200ms',
      },

      // Box shadows
      boxShadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      },
    },
  },

  // Plugin configurations
  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'class',
    }),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
    require('@tailwindcss/container-queries'),
    // Custom plugin for focus-visible utility
    function({ addUtilities }) {
      addUtilities({
        '.focus-visible': {
          'outline': 'none',
          'box-shadow': 'var(--focus-ring-color) 0 0 0 var(--focus-ring-width)',
        },
      })
    },
    // Custom plugin for reduced-motion utility
    function({ addUtilities, theme }) {
      addUtilities({
        '@media (prefers-reduced-motion: reduce)': {
          '*': {
            'animation-duration': '0.01ms !important',
            'animation-iteration-count': '1 !important',
            'transition-duration': '0.01ms !important',
            'scroll-behavior': 'auto !important',
          },
        },
      })
    },
  ],
}

export default config