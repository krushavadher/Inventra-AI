import React, { useEffect, useRef, useState, useId } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  useInView,
} from 'framer-motion';

// 12 predetermined normalized grid locations with independent 3-6s cycles
const RANDOM_SQUARES = [
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

export interface HeroGridLayerProps {
  className?: string;
}

export const HeroGridLayer: React.FC<HeroGridLayerProps> = ({ className = '' }) => {
  const id = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const isInView = useInView(containerRef, { margin: '150px' });

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Parallax: Moves at 0.6x scroll speed (0.4 * scrollY offset relative to parent)
  const { scrollY } = useScroll();
  const parallaxY = useTransform(scrollY, (value) =>
    prefersReducedMotion ? 0 : value * 0.4
  );

  // Detect touch devices to disable spotlight interaction
  useEffect(() => {
    const checkTouch = () => {
      const isTouch =
        window.matchMedia('(hover: none) or (pointer: coarse)').matches ||
        'ontouchstart' in window;
      setIsTouchDevice(isTouch);
    };
    checkTouch();
  }, []);

  // Track container dimensions with ResizeObserver for crisp 40px grid alignment
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions((prev) =>
          prev.width === width && prev.height === height
            ? prev
            : { width, height }
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
    let rafId: number | null = null;

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
      // Pause updates when hero is off-screen
      if (isInView) {
        const stiffness = 0.16;
        const damping = 0.76;
        const ax = (targetX - currentX) * stiffness;
        const ay = (targetY - currentY) * stiffness;
        vx = (vx + ax) * damping;
        vy = (vy + ay) * damping;
        currentX += vx;
        currentY += vy;

        if (spotlightRef.current) {
          spotlightRef.current.style.setProperty(
            '--spotlight-x',
            `${currentX.toFixed(1)}px`
          );
          spotlightRef.current.style.setProperty(
            '--spotlight-y',
            `${currentY.toFixed(1)}px`
          );
          spotlightRef.current.style.opacity = isInside ? '1' : '0';
        }
      }
      rafId = requestAnimationFrame(loop);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    rafId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [isTouchDevice, prefersReducedMotion, isInView]);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 pointer-events-none overflow-hidden select-none ${className}`}
    >
      {/* Parallax Container (moves at 0.6x scroll speed via transform: translateY) */}
      <motion.div
        style={{ y: parallaxY }}
        className="relative w-full h-full"
      >
        {/* Task 3: Blurred Radial Glow (lime to olive #5A632B, ~30% opacity, 25s loop) */}
        <motion.div
          animate={
            isInView && !prefersReducedMotion
              ? {
                  x: [0, 140, -100, 70, 0],
                  y: [0, -80, 100, -50, 0],
                }
              : { x: 0, y: 0 }
          }
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            position: 'absolute',
            top: '20%',
            left: '28%',
            width: '620px',
            height: '620px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(213, 247, 55, 0.30) 0%, rgba(90, 99, 43, 0.30) 52%, transparent 72%)',
            filter: 'blur(95px)',
            pointerEvents: 'none',
            willChange: 'transform',
          }}
        />

        {/* Task 4: Radial edge fade container (grid blends into #181818 at corners) */}
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            maskImage:
              'radial-gradient(ellipse 75% 72% at 50% 50%, black 28%, transparent 86%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 75% 72% at 50% 50%, black 28%, transparent 86%)',
          }}
        >
          {/* Base Grid Layer (40px squares, lines rgba(255,255,255,0.08)) */}
          <svg className="absolute inset-0 w-full h-full">
            <defs>
              <pattern
                id={`${id}-base-grid`}
                width={40}
                height={40}
                patternUnits="userSpaceOnUse"
                x={-1}
                y={-1}
              >
                <path
                  d="M.5 40V.5H40"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${id}-base-grid)`} />

            {/* Task 2: 12 Random squares fading in/out in lime (#D5F737, up to 18% opacity) on 3-6s cycles */}
            {dimensions.width > 0 &&
              dimensions.height > 0 &&
              RANDOM_SQUARES.map((sq, index) => {
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
                      isInView && !prefersReducedMotion
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

          {/* Task 1: Cursor Spotlight - Second Grid Layer with brighter lime lines (#D5F737 @ 25% opacity) */}
          {!isTouchDevice && (
            <div
              ref={spotlightRef}
              className="absolute inset-0 pointer-events-none transition-opacity duration-200"
              style={{
                opacity: 0,
                maskImage:
                  'radial-gradient(300px circle at var(--spotlight-x, -1000px) var(--spotlight-y, -1000px), black 0%, transparent 100%)',
                WebkitMaskImage:
                  'radial-gradient(300px circle at var(--spotlight-x, -1000px) var(--spotlight-y, -1000px), black 0%, transparent 100%)',
              }}
            >
              <svg className="w-full h-full">
                <defs>
                  <pattern
                    id={`${id}-lime-spotlight-grid`}
                    width={40}
                    height={40}
                    patternUnits="userSpaceOnUse"
                    x={-1}
                    y={-1}
                  >
                    <path
                      d="M.5 40V.5H40"
                      fill="none"
                      stroke="rgba(213, 247, 55, 0.25)"
                      strokeWidth="1"
                    />
                  </pattern>
                </defs>
                <rect
                  width="100%"
                  height="100%"
                  fill={`url(#${id}-lime-spotlight-grid)`}
                />
              </svg>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default HeroGridLayer;
