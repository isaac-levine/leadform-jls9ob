/**
 * PostCSS Configuration
 * Version: 1.0.0
 * 
 * Configures CSS processing pipeline for Next.js application with:
 * - Tailwind CSS v3.0.0+ for utility-first CSS
 * - Autoprefixer v10.0.0+ for vendor prefixes
 * - PostCSS Preset Env v8.0.0+ for modern CSS features
 * 
 * Supports browsers:
 * - Chrome >= 90
 * - Firefox >= 88
 * - Safari >= 14
 * - Edge >= 90
 */

module.exports = {
  plugins: [
    // Process Tailwind CSS utilities and components
    // Uses configuration from tailwind.config.ts
    'tailwindcss',

    // Add vendor prefixes for cross-browser compatibility
    ['autoprefixer', {
      flexbox: true,
      grid: true,
      browsers: [
        'Chrome >= 90',
        'Firefox >= 88',
        'Safari >= 14',
        'Edge >= 90'
      ]
    }],

    // Enable modern CSS features with browser compatibility
    ['postcss-preset-env', {
      // Stage 3 features - Candidate recommendation
      stage: 3,
      features: {
        // Disable custom properties processing (handled by browsers)
        'custom-properties': false,
        // Enable CSS nesting
        'nesting-rules': true,
        // Enable modern color functions
        'color-function': true,
        'color-mod-function': true,
        // Enable modern media query ranges
        'media-query-ranges': true
      },
      // Disable autoprefixer as it's handled separately
      autoprefixer: false,
      // Target browsers
      browsers: [
        'Chrome >= 90',
        'Firefox >= 88',
        'Safari >= 14',
        'Edge >= 90'
      ]
    }]
  ]
};