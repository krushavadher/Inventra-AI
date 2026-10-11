import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface AnimatedBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
}

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
  children,
  className,
  style,
  ...props
}) => {
  return (
    <div
      className={cn('relative w-full h-full overflow-hidden bg-[#161616]', className)}
      style={{
        backgroundColor: '#161616',
        ...style,
      }}
      {...props}
    >
      {/* Blurred Animated Blobs Container */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Dark Green Blob 1 */}
        <motion.div
          animate={{
            x: [0, 100, -60, 0],
            y: [0, -80, 60, 0],
            scale: [1, 1.18, 0.92, 1],
          }}
          transition={{
            duration: 24,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
          }}
          style={{
            position: 'absolute',
            top: '-10%',
            left: '15%',
            width: '520px',
            height: '520px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16, 68, 36, 0.55) 0%, rgba(14, 56, 27, 0) 70%)',
            filter: 'blur(90px)',
            willChange: 'transform',
          }}
        />

        {/* Accent Lime Blob 2 */}
        <motion.div
          animate={{
            x: [0, -120, 80, 0],
            y: [0, 90, -70, 0],
            scale: [1, 0.9, 1.15, 1],
          }}
          transition={{
            duration: 28,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
          }}
          style={{
            position: 'absolute',
            top: '30%',
            right: '10%',
            width: '440px',
            height: '440px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(198, 241, 53, 0.16) 0%, rgba(198, 241, 53, 0) 70%)',
            filter: 'blur(100px)',
            willChange: 'transform',
          }}
        />

        {/* Dark Green / Forest Blob 3 */}
        <motion.div
          animate={{
            x: [0, 70, -90, 0],
            y: [0, 100, -50, 0],
            scale: [1, 1.12, 0.95, 1],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
          }}
          style={{
            position: 'absolute',
            bottom: '-15%',
            left: '30%',
            width: '560px',
            height: '560px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(10, 50, 24, 0.48) 0%, rgba(10, 50, 24, 0) 70%)',
            filter: 'blur(95px)',
            willChange: 'transform',
          }}
        />

        {/* Subtle Lime Glow Blob 4 */}
        <motion.div
          animate={{
            x: [0, -80, 60, 0],
            y: [0, -60, 80, 0],
            scale: [1, 1.2, 0.88, 1],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
          }}
          style={{
            position: 'absolute',
            top: '60%',
            left: '-5%',
            width: '380px',
            height: '380px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(198, 241, 53, 0.12) 0%, rgba(198, 241, 53, 0) 70%)',
            filter: 'blur(85px)',
            willChange: 'transform',
          }}
        />
      </div>

      {/* Foreground Content */}
      {children && <div className="relative z-10 w-full h-full">{children}</div>}
    </div>
  );
};

export default AnimatedBackground;
