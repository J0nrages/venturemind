/**
 * Motion - Animation tokens and variants for chat components
 * Consistent animation settings across the chat interface
 */

export const motion = {
  // Spring animations
  spring: {
    type: 'spring',
    stiffness: 260,
    damping: 20
  },
  
  springGentle: {
    type: 'spring',
    stiffness: 100,
    damping: 15
  },
  
  // Easing animations
  ease: {
    type: 'tween',
    ease: 'easeInOut',
    duration: 0.2
  },
  
  easeIn: {
    type: 'tween',
    ease: 'easeIn',
    duration: 0.15
  },
  
  easeOut: {
    type: 'tween',
    ease: 'easeOut',
    duration: 0.15
  }
} as const;

// Animation variants for common patterns
export const variants = {
  // Fade in/out
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  },
  
  // Slide from bottom
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 }
  },
  
  // Slide from right (panels)
  slideLeft: {
    initial: { opacity: 0, x: 100 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 100 }
  },
  
  // Scale animations (omnibox)
  scale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 }
  },
  
  // Message animations
  message: {
    initial: { opacity: 0, y: 10, scale: 0.98 },
    animate: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { ...motion.spring, delay: 0.05 }
    },
    exit: { 
      opacity: 0, 
      y: -10, 
      scale: 0.98,
      transition: motion.easeOut
    }
  },
  
  // Stagger children
  stagger: {
    animate: {
      transition: {
        staggerChildren: 0.05
      }
    }
  }
};

// Transition presets
export const transitions = {
  instant: { duration: 0 },
  fast: { duration: 0.1 },
  normal: { duration: 0.2 },
  slow: { duration: 0.3 },
  verySlow: { duration: 0.5 }
};

// Keyframe animations
export const keyframes = {
  pulse: {
    '0%, 100%': { opacity: 1 },
    '50%': { opacity: 0.5 }
  },
  
  bounce: {
    '0%, 100%': { transform: 'translateY(0)' },
    '50%': { transform: 'translateY(-10px)' }
  },
  
  shake: {
    '0%, 100%': { transform: 'translateX(0)' },
    '25%': { transform: 'translateX(-5px)' },
    '75%': { transform: 'translateX(5px)' }
  },
  
  spin: {
    '0%': { transform: 'rotate(0deg)' },
    '100%': { transform: 'rotate(360deg)' }
  }
};

// CSS data attributes for state-based animations
export const dataStates = {
  loading: 'data-loading',
  error: 'data-error',
  success: 'data-success',
  active: 'data-active',
  disabled: 'data-disabled',
  expanded: 'data-expanded'
};

// Animation utilities
export const animationUtils = {
  // Get stagger delay for list items
  getStaggerDelay: (index: number, baseDelay = 0.05) => index * baseDelay,
  
  // Get distance-based duration
  getDistanceDuration: (distance: number, speed = 0.5) => Math.min(distance * speed, 1),
  
  // Check if user prefers reduced motion
  prefersReducedMotion: () => 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  
  // Wrap animation with reduced motion check
  withReducedMotion: (animation: any) => 
    animationUtils.prefersReducedMotion() ? {} : animation
};