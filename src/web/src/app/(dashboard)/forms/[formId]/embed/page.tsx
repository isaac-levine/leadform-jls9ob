/**
 * @file Form embed page component that displays secure embed code interface
 * @version 1.0.0
 * @description Implements secure form embedding with CSP headers and nonce generation
 */

import { Metadata } from 'next';
import { headers } from 'next/headers';
import FormEmbed from '@/components/forms/FormEmbed';
import { generateFieldId } from '@/utils/form.utils';

/**
 * Generates metadata for the embed page including security headers
 * @param params - Page parameters containing formId
 * @returns Metadata object with security configurations
 */
export async function generateMetadata({ params }: { params: { formId: string } }): Promise<Metadata> {
  // Generate unique nonce for script tags
  const nonce = generateFieldId();
  const headersList = headers();

  // Get origin for CSP configuration
  const origin = headersList.get('host') || '';
  const baseUrl = process.env.NEXT_PUBLIC_FORM_LOADER_URL || '';

  return {
    title: 'Form Embed Code | Lead Capture Platform',
    description: 'Securely embed your lead capture form with Content Security Policy protection',
    
    // Configure strict Content Security Policy
    other: {
      'Content-Security-Policy': [
        `default-src 'self'`,
        `script-src 'self' 'nonce-${nonce}' ${baseUrl}`,
        `style-src 'self' 'unsafe-inline'`,
        `frame-ancestors 'self' https://${origin}`,
        `form-action 'self'`,
        `base-uri 'self'`,
        `upgrade-insecure-requests`,
      ].join('; '),
      
      // Additional security headers
      'X-Frame-Options': 'SAMEORIGIN',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      
      // Cache control for embed code page
      'Cache-Control': 'no-store, must-revalidate',
      'Pragma': 'no-cache',
    },
  };
}

/**
 * Form embed page component that displays the embed code interface
 * with enhanced security features and error handling
 * @param params - Page parameters containing formId
 * @returns Rendered page component
 */
export default function EmbedPage({ params }: { params: { formId: string } }) {
  // Validate formId parameter
  if (!params.formId || typeof params.formId !== 'string') {
    throw new Error('Invalid form ID provided');
  }

  // Generate unique nonce for script tags
  const nonce = generateFieldId();

  return (
    <main 
      className="container mx-auto px-4 py-8"
      data-testid="form-embed-page"
    >
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Form Embed Code
          </h1>
          <p className="text-gray-600">
            Securely embed this form on your website with enhanced security features 
            and Content Security Policy protection.
          </p>
        </header>

        {/* Form embed code component with security props */}
        <FormEmbed 
          formId={params.formId}
          nonce={nonce}
          className="bg-white rounded-lg shadow-sm"
        />

        {/* Security information section */}
        <section className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h2 className="text-lg font-medium text-blue-900 mb-2">
            Security Information
          </h2>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>• Content Security Policy (CSP) headers enabled</li>
            <li>• Subresource Integrity (SRI) verification</li>
            <li>• Secure iframe sandbox restrictions</li>
            <li>• Cross-Origin Resource Sharing (CORS) protection</li>
          </ul>
        </section>
      </div>
    </main>
  );
}