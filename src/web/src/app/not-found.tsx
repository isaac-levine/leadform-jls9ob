"use client"

import Link from 'next/link'
import { Button } from '../components/ui/button'
import { Card, CardHeader, CardContent, CardFooter } from '../components/ui/card'
import { ButtonVariant, ComponentSize } from '../types/ui.types'

/**
 * NotFound component - A user-friendly 404 error page that displays when a route is not found.
 * Implements Acetunity UI and ShadCN design systems with WCAG 2.1 Level AA accessibility standards.
 *
 * @returns {JSX.Element} Rendered not found page component
 * @version 1.0.0
 */
export default function NotFound(): JSX.Element {
  return (
    <main 
      className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900"
      role="main"
      aria-labelledby="error-title"
    >
      <Card 
        className="w-full max-w-md mx-auto"
        role="alert"
        aria-live="polite"
      >
        <CardHeader className="text-center">
          <h1 
            id="error-title"
            className="text-4xl font-bold text-gray-900 dark:text-gray-100"
          >
            404
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Page Not Found
          </p>
        </CardHeader>

        <CardContent>
          <p className="text-center text-gray-600 dark:text-gray-400">
            Sorry, we couldn't find the page you're looking for. The page might have been moved, 
            deleted, or never existed.
          </p>
        </CardContent>

        <CardFooter className="flex justify-center">
          <Link href="/" passHref>
            <Button
              variant={ButtonVariant.PRIMARY}
              size={ComponentSize.MEDIUM}
              className="w-full sm:w-auto"
              aria-label="Return to homepage"
            >
              Return to Homepage
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </main>
  )
}