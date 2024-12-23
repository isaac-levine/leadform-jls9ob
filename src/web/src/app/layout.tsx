'use client';

/**
 * @file Root layout component for Next.js application
 * @version 1.0.0
 * @description Implements global layout with authentication, theme support, error boundaries,
 * and security features as per technical specifications
 */

import { Inter } from 'next/font/google'; // v14.x
import { Analytics } from '@vercel/analytics/react'; // v1.x
import { ErrorBoundary } from 'react-error-boundary'; // v4.x
import { useAuth } from '../hooks/useAuth';

// Import global styles
import '../styles/globals.css';
import '../styles/acetunity.css';
import '../styles/shadcn.css';

// Configure Inter font with optimization
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  variable: '--font-inter'
});

// Enhanced metadata configuration
export const metadata = {
  title: 'AI-Driven Lead Capture & SMS Lead Nurturing Platform',
  description: 'Unified solution for automated lead management through intelligent SMS communication',
  viewport: 'width=device-width, initial-scale=1',
  charset: 'utf-8',
  themeColor: '#ffffff',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png'
  },
  openGraph: {
    title: 'AI-Driven Lead Capture & SMS Platform',
    description: 'Intelligent SMS lead nurturing solution',
    type: 'website'
  }
};

// Security headers configuration
const securityHeaders = {
  'Content-Security-Policy': 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "connect-src 'self' https://api.yourservice.com;",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};

/**
 * Error fallback component for graceful error handling
 */
const ErrorFallback = ({ error, resetErrorBoundary }) => {
  return (
    <div role="alert" className="error-boundary">
      <h2>Something went wrong</h2>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
};

/**
 * Root layout component that provides global context and styling
 * Implements authentication, theme support, and error boundaries
 */
export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  // Initialize authentication hook
  const { user, loading, error } = useAuth();

  // Log security audit for page access
  const logPageAccess = () => {
    if (user) {
      console.info('Page access:', {
        userId: user.id,
        timestamp: new Date().toISOString(),
        userRole: user.role
      });
    }
  };

  // Handle authentication loading state
  if (loading) {
    return (
      <html lang="en" className={inter.className}>
        <body>
          <div className="loading-screen">
            <div className="spinner"></div>
            <p>Loading application...</p>
          </div>
        </body>
      </html>
    );
  }

  // Handle authentication error state
  if (error) {
    return (
      <html lang="en" className={inter.className}>
        <body>
          <div className="error-screen">
            <h1>Authentication Error</h1>
            <p>{error.message}</p>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="en" className={inter.className}>
      <head>
        {/* Apply security headers */}
        {Object.entries(securityHeaders).map(([key, value]) => (
          <meta key={key} httpEquiv={key} content={value} />
        ))}
      </head>
      <body>
        <ErrorBoundary
          FallbackComponent={ErrorFallback}
          onReset={() => {
            // Reset error boundary state
            window.location.reload();
          }}
          onError={(error) => {
            // Log error for monitoring
            console.error('Application error:', error);
          }}
        >
          {/* Main application wrapper */}
          <div className="app-container">
            {/* Render child components */}
            {children}
          </div>

          {/* Analytics integration */}
          <Analytics />
        </ErrorBoundary>

        {/* Theme script to prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark')
                } else {
                  document.documentElement.classList.remove('dark')
                }
              } catch (_) {}
            `,
          }}
        />
      </body>
    </html>
  );
}