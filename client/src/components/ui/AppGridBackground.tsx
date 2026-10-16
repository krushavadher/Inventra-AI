import React, { useEffect, useRef, useState, useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

// 12 predetermined normalized grid locations with independent 3-6s pulsing cycles
const PULSING_SQUARES = [
  { fx: 0.12, fy: 0.18, duration: 4.2, delay: 0.2 },
  { fx: 0.26, fy: 0.35, duration: 3.5, delay: 1.1 },
  { fx: 0.44, fy: 0.15, duration: 5.4, delay: 0.6 },
  { fx: 0.62, fy: 0.28, duration: 4.8, delay: 1.8 },
  { fx: 0.82, fy: 0.22, duration: 3.8, delay: 0.9 },
  { fx: 0.15, fy: 0.68, duration: 4.5, delay: 1.4 },
  { fx: 0.36, fy: 0.82, duration: 5.8, delay: 2.2 },
  { fx: 0.52, fy: 0.64, duration: 3.6, delay: 0.7 },
  { fx: 0.74, fy: 0.75, duration: 5.1, delay: 1.5 },
  { fx: 0.88, fy: 0.58, duration: 4.0, delay: 2.5 },
  { fx: 0.22, fy: 0.48, duration: 4.6, delay: 0.3 },
  { fx: 0.68, fy: 0.46, duration: 3.4, delay: 1.2 },
];

export interface AppGridBackgroundProps {
  className?: string;
}

export const AppGridBackground: React.FC<AppGridBackgroundProps> = ({ className = '' }) => {
  const id = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Detect touch devices to disable spotlight interaction
  useEffect(() => {
    const isTouch =
      window.matchMedia('(hover: none) or (pointer: coarse)').matches ||
      'ontouchstart' in window;
    setIsTouchDevice(isTouch);
  }, []);

  // Track container dimensions with ResizeObserver for 40px grid alignment
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions((prev) =>
          prev.width === width && prev.height === height ? prev : { width, height }
        );
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Spring-smoothed Cursor Spotlight in requestAnimationFrame
  useEffect(() => {
    if (isTouchDevice || prefersReducedMotion) return;

    let targetX = -1000;
    let targetY = -1000;
    let currentX = -1000;
    let currentY = -1000;
    let vx = 0;
    let vy = 0;
    let isInside = false;
    let isTabVisible = document.visibilityState === 'visible';
    let rafId: number | null = null;

    const handleVisibilityChange = () => {
      isTabVisible = document.visibilityState === 'visible';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const inBounds =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      if (inBounds) {
        targetX = e.clientX - rect.left;
        targetY = e.clientY - rect.top;
        if (!isInside) {
          isInside = true;
          if (currentX === -1000) {
            currentX = targetX;
            currentY = targetY;
          }
        }
      } else {
        isInside = false;
      }
    };

    const handleMouseLeave = () => {
      isInside = false;
    };

    const loop = () => {
      if (isTabVisible) {
        const stiffness = 0.16;
        const damping = 0.76;
        const ax = (targetX - currentX) * stiffness;
        const ay = (targetY - currentY) * stiffness;
        vx = (vx + ax) * damping;
        vy = (vy + ay) * damping;
        currentX += vx;
        currentY += vy;

        if (spotlightRef.current) {
          spotlightRef.current.style.setProperty('--spotlight-x', `${currentX.toFixed(1)}px`);
          spotlightRef.current.style.setProperty('--spotlight-y', `${currentY.toFixed(1)}px`);
          spotlightRef.current.style.opacity = isInside ? '1' : '0';
        }
      }
      rafId = requestAnimationFrame(loop);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    rafId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [isTouchDevice, prefersReducedMotion]);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 pointer-events-none overflow-hidden select-none z-0 ${className}`}
    >
      {/* Blurred Ambient Glows (Lime #D5F737 & Olive #5A632B) */}
      <motion.div
        animate={
          !prefersReducedMotion
            ? {
                x: [0, 80, -60, 40, 0],
                y: [0, -50, 70, -30, 0],
              }
            : { x: 0, y: 0 }
        }
        transition={{
          duration: 26,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          position: 'absolute',
          top: '15%',
          left: '20%',
          width: '540px',
          height: '540px',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(213, 247, 55, 0.12) 0%, rgba(90, 99, 43, 0.18) 50%, transparent 72%)',
          filter: 'blur(95px)',
          pointerEvents: 'none',
          willChange: 'transform',
        }}
      />

      <motion.div
        animate={
          !prefersReducedMotion
            ? {
                x: [0, -70, 50, 0],
                y: [0, 60, -40, 0],
              }
            : { x: 0, y: 0 }
        }
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          position: 'absolute',
          bottom: '10%',
          right: '15%',
          width: '480px',
          height: '480px',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(90, 99, 43, 0.20) 0%, rgba(213, 247, 55, 0.08) 55%, transparent 70%)',
          filter: 'blur(90px)',
          pointerEvents: 'none',
          willChange: 'transform',
        }}
      />

      {/* Grid Layer Container */}
      <div className="absolute inset-0 w-full h-full">
        {/* Base Grid Layer (40px squares, lines rgba(255,255,255,0.06)) */}
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <pattern
              id={`${id}-app-base-grid`}
              width={40}
              height={40}
              patternUnits="userSpaceOnUse"
              x={-1}
              y={-1}
            >
              <path
                d="M.5 40V.5H40"
                fill="none"
                stroke="rgba(255, 255, 255, 0.06)"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${id}-app-base-grid)`} />

          {/* 12 Random pulsing squares in lime (#D5F737 up to 18% opacity) */}
          {dimensions.width > 0 &&
            dimensions.height > 0 &&
            PULSING_SQUARES.map((sq, index) => {
              const col = Math.floor((sq.fx * dimensions.width) / 40);
              const row = Math.floor((sq.fy * dimensions.height) / 40);
              const squareX = col * 40 + 0.5;
              const squareY = row * 40 + 0.5;

              return (
                <motion.rect
                  key={index}
                  x={squareX}
                  y={squareY}
                  width={39}
                  height={39}
                  fill="#D5F737"
                  initial={{ opacity: 0 }}
                  animate={
                    !prefersReducedMotion
                      ? { opacity: [0, 0.18, 0] }
                      : { opacity: 0.06 }
                  }
                  transition={{
                    duration: sq.duration,
                    delay: sq.delay,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  strokeWidth="0"
                />
              );
            })}
        </svg>

        {/* Cursor Spotlight: Brighter lime grid layer (#D5F737 @ 18% opacity) in soft 260px circle */}
        {!isTouchDevice && (
          <div
            ref={spotlightRef}
            className="absolute inset-0 pointer-events-none transition-opacity duration-200"
            style={{
              opacity: 0,
              maskImage:
                'radial-gradient(260px circle at var(--spotlight-x, -1000px) var(--spotlight-y, -1000px), black 0%, transparent 100%)',
              WebkitMaskImage:
                'radial-gradient(260px circle at var(--spotlight-x, -1000px) var(--spotlight-y, -1000px), black 0%, transparent 100%)',
            }}
          >
            <svg className="w-full h-full">
              <defs>
                <pattern
                  id={`${id}-app-lime-spotlight-grid`}
                  width={40}
                  height={40}
                  patternUnits="userSpaceOnUse"
                  x={-1}
                  y={-1}
                >
                  <path
                    d="M.5 40V.5H40"
                    fill="none"
                    stroke="rgba(213, 247, 55, 0.18)"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>
              <rect
                width="100%"
                height="100%"
                fill={`url(#${id}-app-lime-spotlight-grid)`}
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppGridBackground;
