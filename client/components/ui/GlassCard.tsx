import React from 'react';
import { cn } from '@/lib/utils';

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ children, className, style, onMouseMove, ...props }, ref) => {
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      e.currentTarget.style.setProperty('--card-mouse-x', `${x.toFixed(1)}px`);
      e.currentTarget.style.setProperty('--card-mouse-y', `${y.toFixed(1)}px`);
      if (onMouseMove) onMouseMove(e);
    };

    return (
      <div
        ref={ref}
        onMouseMove={handleMouseMove}
        className={cn(
          'app-card transition-all duration-300 text-white',
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
