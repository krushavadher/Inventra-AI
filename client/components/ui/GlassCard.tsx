import React from 'react';
import { cn } from '@/lib/utils';

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ children, className, style, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'transition-all duration-300 text-white glass',
          className
        )}
        style={{
          backgroundColor: 'rgba(40, 40, 40, 0.45)',
          backdropFilter: 'blur(20px) saturate(90%)',
          WebkitBackdropFilter: 'blur(20px) saturate(90%)',
          border: '1px solid rgba(255, 255, 255, 0.10)',
          borderRadius: '24px',
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName = 'GlassCard';

export default GlassCard;
