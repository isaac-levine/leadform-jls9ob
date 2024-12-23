"use client";

import React, { useState, useCallback } from 'react';
import { cn } from 'clsx';
import { AvatarProps, ComponentSize } from '../../types/ui.types';

/**
 * Size-based class mappings following Acetunity UI design system
 * Includes responsive sizing, transitions, and interactive states
 */
const sizeClasses = {
  [ComponentSize.SMALL]: 'w-8 h-8 text-xs',
  [ComponentSize.MEDIUM]: 'w-12 h-12 text-sm',
  [ComponentSize.LARGE]: 'w-16 h-16 text-base'
};

/**
 * Base classes applied to all avatar variants
 * Implements core styling from ShadCN design system
 */
const baseClasses = 'relative inline-flex items-center justify-center overflow-hidden rounded-full bg-muted';

/**
 * Fallback classes for when image fails to load
 * Ensures consistent appearance with proper contrast
 */
const fallbackClasses = 'flex items-center justify-center font-medium uppercase text-muted-foreground';

/**
 * Generates consistent initials from user name
 * Handles edge cases and non-Latin characters
 * @param name - User's full name
 * @returns Formatted initials string
 */
const getInitials = (name: string): string => {
  if (!name?.trim()) return '?';

  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';

  const firstInitial = words[0][0];
  const lastInitial = words.length > 1 ? words[words.length - 1][0] : '';

  return (firstInitial + (lastInitial !== firstInitial ? lastInitial : ''))
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Generates consistent background color based on user ID
 * Ensures WCAG contrast compliance
 * @param userId - Unique user identifier
 * @returns CSS HSL color string
 */
const generateBackgroundColor = (userId: string): string => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Generate HSL color with fixed saturation and lightness for consistency
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 65%, 85%)`;
};

/**
 * Avatar Component
 * Displays user profile image with fallback to initials
 * Implements Acetunity UI and ShadCN design systems
 */
export const Avatar = React.memo<AvatarProps>(({
  user,
  size = ComponentSize.MEDIUM,
  showStatus = false,
  className,
  onClick
}) => {
  const [imageError, setImageError] = useState(false);

  /**
   * Handles image load errors
   * Triggers fallback to initials display
   */
  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  // Generate fallback background color based on user ID
  const fallbackColor = generateBackgroundColor(user.id);
  
  // Compute initials for fallback display
  const initials = getInitials(user.name);

  return (
    <div
      className={cn(
        baseClasses,
        sizeClasses[size],
        'select-none',
        onClick && 'cursor-pointer hover:opacity-90',
        className
      )}
      onClick={onClick}
      style={imageError ? { backgroundColor: fallbackColor } : undefined}
      role={onClick ? 'button' : 'img'}
      aria-label={`Avatar for ${user.name}`}
      tabIndex={onClick ? 0 : undefined}
    >
      {!imageError && user.profileImageUrl ? (
        <img
          src={user.profileImageUrl}
          alt={`${user.name}'s avatar`}
          className="h-full w-full object-cover"
          onError={handleImageError}
          loading="lazy"
        />
      ) : (
        <span className={cn(fallbackClasses)}>
          {initials}
        </span>
      )}

      {showStatus && (
        <span
          className={cn(
            'absolute bottom-0 right-0 block rounded-full ring-2 ring-background',
            size === ComponentSize.SMALL ? 'h-2 w-2' : 'h-3 w-3',
            user.isOnline ? 'bg-success' : 'bg-muted'
          )}
          aria-hidden="true"
        />
      )}
    </div>
  );
});

Avatar.displayName = 'Avatar';