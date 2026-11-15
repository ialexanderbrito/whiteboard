import React from 'react';
import { HugeiconsIcon, type HugeiconsProps, type IconSvgElement } from '@hugeicons/react';
import { cn } from '@/lib/utils';

export interface IconProps extends Omit<HugeiconsProps, 'icon'> {
  className?: string;
  size?: number | string;
  strokeWidth?: number;
}

export type HugeIconComponent = React.ForwardRefExoticComponent<
  IconProps & React.RefAttributes<SVGSVGElement>
>;

// Compatibility aliases with Lucide types
export type LucideIcon = HugeIconComponent;
export type LucideProps = IconProps;

/**
 * Factory that creates a standardized Stroke Rounded Hugeicon React component.
 * Uses 1.5px stroke width by default for modern refined aesthetics (Emil Kowalski / Linear style),
 * while supporting overrides and native Tailwind className sizing/colors.
 */
export function createHugeIcon(icon: IconSvgElement, displayName: string): HugeIconComponent {
  const IconComponent = React.forwardRef<SVGSVGElement, IconProps>((props, ref) => {
    const { className, strokeWidth = 1.5, ...rest } = props;
    return (
      <HugeiconsIcon
        ref={ref}
        icon={icon}
        strokeWidth={strokeWidth}
        className={cn('shrink-0 select-none inline-block align-middle', className)}
        {...rest}
      />
    );
  });
  IconComponent.displayName = displayName;
  return IconComponent;
}
