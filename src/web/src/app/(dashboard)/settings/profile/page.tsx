"use client"

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../../../../hooks/useAuth';
import { Card, CardHeader, CardContent } from '../../../../../components/ui/card';
import { useToast } from '../../../../../hooks/useToast';

// Validation schema for profile form
const profileSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  email: z.string()
    .email('Please enter a valid email address')
    .min(5, 'Email must be at least 5 characters')
    .max(254, 'Email cannot exceed 254 characters'),
  phone: z.string()
    .regex(/^\+[1-9]\d{1,14}$/, 'Phone number must be in E.164 format (e.g., +1234567890)')
    .optional()
    .or(z.literal('')),
  role: z.string().optional(),
  organizationName: z.string().optional()
});

type ProfileFormData = z.infer<typeof profileSchema>;

/**
 * Profile Settings Page Component
 * Implements secure profile management with enhanced validation and accessibility
 */
export default function ProfilePage() {
  // Get auth context and toast notifications
  const { user, loading, updateProfile } = useAuth();
  const toast = useToast();

  // Initialize form with react-hook-form and zod validation
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty }
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: useMemo(() => ({
      name: user?.name || '',
      email: user?.email || '',
      phone: '',
      role: user?.role || '',
      organizationName: ''
    }), [user])
  });

  // Reset form when user data changes
  useEffect(() => {
    if (user) {
      reset({
        name: user.name,
        email: user.email,
        phone: '',
        role: user.role,
        organizationName: ''
      });
    }
  }, [user, reset]);

  // Handle form submission with security measures
  const onSubmit = async (data: ProfileFormData) => {
    try {
      // Update profile with validation and security checks
      await updateProfile({
        name: data.name.trim(),
        email: data.email.toLowerCase().trim(),
        phone: data.phone ? data.phone.trim() : undefined
      });

      // Show success notification
      toast.show({
        type: 'success',
        message: 'Profile updated successfully',
        duration: 3000
      });
    } catch (error) {
      // Show error notification
      toast.show({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to update profile',
        duration: 5000
      });
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto" role="region" aria-label="Profile Settings">
        <CardHeader className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Profile Settings</h1>
          <p className="text-muted-foreground">
            Manage your account information and preferences
          </p>
        </CardHeader>

        <CardContent>
          <form 
            onSubmit={handleSubmit(onSubmit)} 
            className="space-y-6"
            noValidate
          >
            {/* Name Field */}
            <div className="space-y-2">
              <label 
                htmlFor="name"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Full Name
              </label>
              <input
                id="name"
                type="text"
                {...register('name')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                aria-describedby={errors.name ? 'name-error' : undefined}
                aria-invalid={!!errors.name}
              />
              {errors.name && (
                <p id="name-error" className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <label 
                htmlFor="email"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                {...register('email')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                aria-describedby={errors.email ? 'email-error' : undefined}
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <p id="email-error" className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Phone Field */}
            <div className="space-y-2">
              <label 
                htmlFor="phone"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Phone Number (Optional)
              </label>
              <input
                id="phone"
                type="tel"
                {...register('phone')}
                placeholder="+1234567890"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                aria-describedby={errors.phone ? 'phone-error' : undefined}
                aria-invalid={!!errors.phone}
              />
              {errors.phone && (
                <p id="phone-error" className="text-sm text-destructive">
                  {errors.phone.message}
                </p>
              )}
            </div>

            {/* Role Display */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">
                Role
              </label>
              <p className="text-sm text-muted-foreground">
                {user?.role || 'Loading...'}
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isDirty || isSubmitting}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors h-10 px-4 py-2 w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
              aria-disabled={!isDirty || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin mr-2">⟳</span>
                  Updating...
                </>
              ) : (
                'Update Profile'
              )}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}