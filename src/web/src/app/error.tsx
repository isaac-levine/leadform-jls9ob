'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '../components/ui/button'
import { Card, CardHeader, CardContent, CardFooter } from '../components/ui/card'
import { ButtonVariant, ComponentSize } from '../types/ui.types'

/**
 * Props interface for the Error component
 */
interface ErrorProps {
  error: Error
  reset: () => void
}

/**
 * Error boundary component that provides user-friendly error handling with recovery options.
 * Implements Acetunity UI and ShadCN design system with WCAG 2.1 Level AA compliance.
 *
 * @param {ErrorProps} props - Component props containing error details and reset callback
 * @returns {JSX.Element} Rendered error page component
 */
const Error: React.FC<ErrorProps> = ({ error, reset }) => {
  const router = useRouter()

  // Log error details for monitoring
  useEffect(() => {
    // Log to monitoring service
    console.error('Application error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    })
  }, [error])

  // Handle retry attempt
  const handleRetry = async () => {
    try {
      reset()
    } catch (retryError) {
      console.error('Error recovery failed:', retryError)
    }
  }

  // Handle navigation to dashboard
  const handleDashboardReturn = () => {
    router.push('/dashboard')
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900"
      role="alert"
      aria-live="assertive"
    >
      <Card className="w-full max-w-md" aria-labelledby="error-title">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <svg
              className="w-12 h-12 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1
            id="error-title"
            className="text-2xl font-semibold text-center text-gray-900 dark:text-gray-100"
          >
            Something went wrong
          </h1>
          <p className="mt-2 text-center text-gray-600 dark:text-gray-400">
            {error.message || 'An unexpected error occurred. Please try again.'}
          </p>
        </CardHeader>

        <CardContent>
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Error details have been logged and our team has been notified.
              You can try to recover by:
            </p>
            <ul className="mt-2 list-disc list-inside text-sm text-gray-600 dark:text-gray-400">
              <li>Retrying the failed operation</li>
              <li>Returning to the dashboard</li>
              <li>Refreshing the page</li>
            </ul>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            variant={ButtonVariant.PRIMARY}
            size={ComponentSize.MEDIUM}
            onClick={handleRetry}
            aria-label="Retry failed operation"
          >
            Try Again
          </Button>
          <Button
            variant={ButtonVariant.OUTLINE}
            size={ComponentSize.MEDIUM}
            onClick={handleDashboardReturn}
            aria-label="Return to dashboard"
          >
            Return to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export default Error