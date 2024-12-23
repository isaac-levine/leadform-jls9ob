"use client";

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import useUIStore from '../../store/ui.store';
import Button from '../ui/button';
import Tooltip from '../ui/tooltip';
import { ButtonVariant, ComponentSize } from '../../types/ui.types';

/**
 * ThemeToggle component that provides an accessible button for switching between light and dark themes.
 * Implements WCAG 2.1 Level AA accessibility standards with proper aria attributes and keyboard navigation.
 * 
 * @version 1.0.0
 * @returns {JSX.Element} A theme toggle button with tooltip and appropriate icon
 */
const ThemeToggle: React.FC = () => {
  // Get current theme and toggle function from UI store
  const { theme, toggleTheme } = useUIStore();

  // Determine icon and accessibility text based on current theme
  const isLightTheme = theme === 'light';
  const Icon = isLightTheme ? Moon : Sun;
  const ariaLabel = isLightTheme 
    ? 'Switch to dark theme'
    : 'Switch to light theme';

  return (
    <Tooltip
      content={ariaLabel}
      position="bottom"
      size={ComponentSize.SMALL}
      showDelay={300}
      className="select-none"
    >
      <Button
        variant={ButtonVariant.GHOST}
        size={ComponentSize.MEDIUM}
        onClick={toggleTheme}
        className="relative w-10 h-10 p-0 rounded-full"
        aria-label={ariaLabel}
        aria-pressed={!isLightTheme}
        data-testid="theme-toggle"
      >
        <Icon
          className={`
            w-5 h-5 
            transition-all 
            duration-300 
            ease-in-out
            ${isLightTheme ? 'rotate-0' : 'rotate-180'}
            ${isLightTheme ? 'text-gray-600' : 'text-gray-400'}
            hover:text-primary-600
            dark:hover:text-primary-400
          `}
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <span className="sr-only">{ariaLabel}</span>
      </Button>
    </Tooltip>
  );
};

export default ThemeToggle;