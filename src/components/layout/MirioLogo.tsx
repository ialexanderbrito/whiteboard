import React from 'react';
import { cn } from '@/lib/utils';

export interface MirioLogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  variant?: 'full' | 'compact';
  className?: string;
  alt?: string;
}

export const MirioLogo: React.FC<MirioLogoProps> = ({
  variant = 'full',
  className,
  alt = 'Mirio',
  ...props
}) => {
  if (variant === 'compact') {
    return (
      <span className="inline-flex items-center justify-center shrink-0">
        <img
          src="/logo-icon-light.png"
          alt={alt}
          className={cn('h-6 w-auto object-contain select-none dark:hidden', className)}
          loading="eager"
          {...props}
        />
        <img
          src="/logo-icon-dark.png"
          alt={alt}
          className={cn('h-6 w-auto object-contain select-none hidden dark:block', className)}
          loading="eager"
          {...props}
        />
      </span>
    );
  }

  return (
    <span className="inline-flex items-center justify-center shrink-0">
      <img
        src="/logo-full-light.png"
        alt={alt}
        className={cn('h-8 w-auto object-contain select-none dark:hidden', className)}
        loading="eager"
        {...props}
      />
      <img
        src="/logo-full-dark.png"
        alt={alt}
        className={cn('h-8 w-auto object-contain select-none hidden dark:block', className)}
        loading="eager"
        {...props}
      />
    </span>
  );
};
