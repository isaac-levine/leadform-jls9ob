/**
 * @file FormEmbed.tsx
 * @version 1.0.0
 * @description A React component that displays and manages the embed code for a form,
 * implementing secure integration options and accessibility support.
 */

import React, { useCallback, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast'; // v2.4.0
import Button from '../ui/button';
import { useForm } from '../../hooks/useForm';
import { ButtonVariant, ComponentSize } from '../../types/ui.types';
import { generateEmbedCode } from '../../utils/form.utils';

interface FormEmbedProps {
  formId: string;
  className?: string;
}

/**
 * FormEmbed component for securely displaying and managing form embed code
 * with enhanced security features and accessibility support.
 */
const FormEmbed: React.FC<FormEmbedProps> = ({ formId, className }) => {
  // Get form data using the useForm hook
  const { form } = useForm(formId);
  
  // Reference for embed code container
  const embedCodeRef = useRef<HTMLPreElement>(null);

  /**
   * Generates a secure embed code with CSP headers and nonce
   */
  const getSecureEmbedCode = useCallback(() => {
    if (!form) return '';
    return generateEmbedCode(form.id.toString());
  }, [form]);

  /**
   * Securely copies embed code to clipboard with error handling
   * and accessibility announcements
   */
  const copyEmbedCode = useCallback(async () => {
    if (!form) {
      toast.error('Form data not available');
      return;
    }

    try {
      const embedCode = getSecureEmbedCode();
      
      // Attempt to use modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(embedCode);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = embedCode;
        textArea.setAttribute('readonly', '');
        textArea.style.position = 'absolute';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      // Show success message with screen reader announcement
      toast.success('Embed code copied to clipboard', {
        ariaProps: {
          role: 'status',
          'aria-live': 'polite',
        },
      });
    } catch (error) {
      console.error('Copy failed:', error);
      toast.error('Failed to copy embed code', {
        ariaProps: {
          role: 'alert',
          'aria-live': 'assertive',
        },
      });
    }
  }, [form, getSecureEmbedCode]);

  // Set up keyboard shortcuts for accessibility
  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'c' && 
          document.activeElement === embedCodeRef.current) {
        event.preventDefault();
        copyEmbedCode();
      }
    };

    document.addEventListener('keydown', handleKeyboard);
    return () => document.removeEventListener('keydown', handleKeyboard);
  }, [copyEmbedCode]);

  if (!form) {
    return (
      <div 
        className="text-gray-500 p-4 text-center"
        role="alert"
        aria-live="polite"
      >
        Loading form embed code...
      </div>
    );
  }

  return (
    <div 
      className={`bg-white rounded-lg shadow-sm p-4 ${className || ''}`}
      data-testid="form-embed-container"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          Form Embed Code
        </h3>
        <Button
          variant={ButtonVariant.PRIMARY}
          size={ComponentSize.MEDIUM}
          onClick={copyEmbedCode}
          aria-label="Copy embed code to clipboard"
          data-testid="copy-embed-button"
        >
          Copy Code
        </Button>
      </div>

      <div className="relative">
        <pre
          ref={embedCodeRef}
          className="bg-gray-50 rounded p-4 overflow-x-auto text-sm font-mono"
          tabIndex={0}
          role="textbox"
          aria-label="Form embed code"
          data-testid="embed-code-display"
        >
          {getSecureEmbedCode()}
        </pre>
      </div>

      <div className="mt-4 text-sm text-gray-500">
        <h4 className="font-medium mb-2">Integration Instructions:</h4>
        <ol className="list-decimal list-inside space-y-2">
          <li>Copy the embed code above</li>
          <li>Paste it into your website's HTML where you want the form to appear</li>
          <li>The form will automatically load with all configured fields and styling</li>
        </ol>
        <p className="mt-2 text-xs">
          Note: This embed code includes security features like Content Security Policy (CSP) 
          headers and subresource integrity checks.
        </p>
      </div>
    </div>
  );
};

export default FormEmbed;