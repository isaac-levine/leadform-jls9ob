/**
 * @file NextAuth.js API route handler for authentication
 * @version 1.0.0
 * @description Implements secure JWT-based authentication with comprehensive security features
 * including role-based access control, rate limiting, and secure session management
 */

import NextAuth from 'next-auth'; // v4.24.0
import CredentialsProvider from 'next-auth/providers/credentials'; // v4.24.0
import { z } from 'zod'; // v3.22.0
import { 
  authenticate, 
  register, 
  refreshSession, 
  validateRequest, 
  sanitizeInput 
} from '../../../lib/auth';
import { 
  AuthUser, 
  LoginCredentials, 
  TokenPayload 
} from '../../../types/auth.types';

// Security configuration constants
const RATE_LIMIT_CONFIG = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // Maximum requests per window
  message: 'Too many authentication attempts, please try again later'
};

const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 // 7 days
};

const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; frame-ancestors 'none';"
};

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  rememberMe: z.boolean().optional()
});

/**
 * NextAuth configuration options with enhanced security features
 */
const authOptions = {
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            throw new Error('Invalid credentials');
          }

          // Validate and sanitize input
          const sanitizedCredentials = {
            email: sanitizeInput(credentials.email),
            password: credentials.password // Don't sanitize password
          };

          // Validate credentials format
          const validatedData = loginSchema.parse(sanitizedCredentials);

          // Authenticate user
          const user = await authenticate(validatedData);
          if (!user) throw new Error('Authentication failed');

          return user;
        } catch (error) {
          console.error('Authorization error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    maxAge: 60 * 60, // 1 hour
    encryption: true
  },
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: AUTH_COOKIE_OPTIONS
    }
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.user = user as AuthUser;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.user) {
        session.user = token.user;
      }
      return session;
    }
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error'
  },
  debug: process.env.NODE_ENV === 'development'
};

/**
 * Handles GET requests for authentication endpoints
 * Implements rate limiting and security headers
 */
export async function GET(request: Request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await validateRequest(request, RATE_LIMIT_CONFIG);
    if (!rateLimitResult.success) {
      return new Response(rateLimitResult.message, {
        status: 429,
        headers: { ...SECURITY_HEADERS }
      });
    }

    const response = await NextAuth(authOptions);
    
    // Add security headers
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    console.error('Authentication GET error:', error);
    return new Response('Internal server error', {
      status: 500,
      headers: { ...SECURITY_HEADERS }
    });
  }
}

/**
 * Handles POST requests for authentication
 * Implements comprehensive security measures and input validation
 */
export async function POST(request: Request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await validateRequest(request, RATE_LIMIT_CONFIG);
    if (!rateLimitResult.success) {
      return new Response(rateLimitResult.message, {
        status: 429,
        headers: { ...SECURITY_HEADERS }
      });
    }

    // Parse and validate request body
    const body = await request.json();
    const sanitizedBody = {
      ...body,
      email: sanitizeInput(body.email),
      password: body.password // Don't sanitize password
    };

    // Handle different authentication actions
    const response = await NextAuth(authOptions);

    // Add security headers
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // Set secure cookie options
    response.headers.set('Set-Cookie', [
      `next-auth.session-token=${response.headers.get('Set-Cookie')}; ${
        Object.entries(AUTH_COOKIE_OPTIONS)
          .map(([key, value]) => `${key}=${value}`)
          .join('; ')
      }`
    ]);

    return response;
  } catch (error) {
    console.error('Authentication POST error:', error);
    return new Response('Internal server error', {
      status: 500,
      headers: { ...SECURITY_HEADERS }
    });
  }
}