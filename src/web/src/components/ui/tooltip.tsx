"use client";

import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { twMerge } from 'tailwind-merge';
import clsx from 'clsx';
import { ComponentSize } from '../../types/ui.types';

// Constants for tooltip configuration
const TOOLTIP_POSITIONS = {
  TOP: 'top',
  BOTTOM: 'bottom',
  LEFT: 'left',
  RIGHT: 'right'
} as const;

const TOOLTIP_OFFSET = 8;
const TOOLTIP_SHOW_DELAY = 200;
const TOOLTIP_HIDE_DELAY = 150;

// Type for tooltip positions
type TooltipPosition = keyof typeof TOOLTIP_POSITIONS;

// Interface for tooltip props
interface TooltipProps {
  content: string | React.ReactNode;
  position?: TooltipPosition;
  size?: ComponentSize;
  className?: string;
  children: React.ReactNode;
  showDelay?: number;
  hideDelay?: number;
  disabled?: boolean;
  ariaLabel?: string;
}

/**
 * A reusable tooltip component that provides contextual information on hover
 * Built with Acetunity UI and ShadCN design systems
 * 
 * @version 1.0.0
 */
const Tooltip: React.FC<TooltipProps> = memo(({
  content,
  position = TOOLTIP_POSITIONS.TOP,
  size = ComponentSize.MEDIUM,
  className = '',
  children,
  showDelay = TOOLTIP_SHOW_DELAY,
  hideDelay = TOOLTIP_HIDE_DELAY,
  disabled = false,
  ariaLabel
}) => {
  // State for tooltip visibility
  const [isVisible, setIsVisible] = useState(false);
  
  // Refs for timing and positioning
  const showTimeoutRef = useRef<NodeJS.Timeout>();
  const hideTimeoutRef = useRef<NodeJS.Timeout>();
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  // Calculate position-specific styles
  const getPositionStyles = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return {};

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    const positions = {
      [TOOLTIP_POSITIONS.TOP]: {
        top: `${-tooltipRect.height - TOOLTIP_OFFSET}px`,
        left: '50%',
        transform: 'translateX(-50%)'
      },
      [TOOLTIP_POSITIONS.BOTTOM]: {
        top: `${triggerRect.height + TOOLTIP_OFFSET}px`,
        left: '50%',
        transform: 'translateX(-50%)'
      },
      [TOOLTIP_POSITIONS.LEFT]: {
        top: '50%',
        left: `${-tooltipRect.width - TOOLTIP_OFFSET}px`,
        transform: 'translateY(-50%)'
      },
      [TOOLTIP_POSITIONS.RIGHT]: {
        top: '50%',
        left: `${triggerRect.width + TOOLTIP_OFFSET}px`,
        transform: 'translateY(-50%)'
      }
    };

    return positions[position];
  }, [position]);

  // Size-specific classes
  const sizeClasses = {
    [ComponentSize.SMALL]: 'text-xs py-1 px-2',
    [ComponentSize.MEDIUM]: 'text-sm py-2 px-3'
  };

  // Position-specific classes
  const positionClasses = {
    [TOOLTIP_POSITIONS.TOP]: 'origin-bottom',
    [TOOLTIP_POSITIONS.BOTTOM]: 'origin-top',
    [TOOLTIP_POSITIONS.LEFT]: 'origin-right',
    [TOOLTIP_POSITIONS.RIGHT]: 'origin-left'
  };

  // Handle mouse enter
  const handleMouseEnter = useCallback(() => {
    if (disabled) return;
    
    hideTimeoutRef.current && clearTimeout(hideTimeoutRef.current);
    showTimeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, showDelay);
  }, [disabled, showDelay]);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    showTimeoutRef.current && clearTimeout(showTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, hideDelay);
  }, [hideDelay]);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      showTimeoutRef.current && clearTimeout(showTimeoutRef.current);
      hideTimeoutRef.current && clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  // Merge classes for tooltip container
  const tooltipClasses = twMerge(
    'absolute z-50 rounded-md bg-gray-900 text-white shadow-sm',
    'transition-all duration-200',
    sizeClasses[size],
    positionClasses[position],
    isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none',
    className
  );

  // Merge classes for trigger container
  const triggerClasses = clsx(
    'inline-block relative',
    disabled && 'cursor-not-allowed opacity-50'
  );

  return (
    <div
      className={triggerClasses}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      ref={triggerRef}
      role="tooltip"
      aria-label={ariaLabel}
    >
      {children}
      <div
        ref={tooltipRef}
        className={tooltipClasses}
        style={getPositionStyles()}
        role="tooltip"
        aria-hidden={!isVisible}
      >
        {content}
      </div>
    </div>
  );
});

// Display name for debugging
Tooltip.displayName = 'Tooltip';

export default Tooltip;