/**
 * Animation Tokens
 *
 * Durations, easings, and delays for consistent motion design.
 * Migrated and expanded from shared-constants.
 */

/**
 * Animation durations in milliseconds
 */
export const duration = {
  instant: 0,
  fastest: 50,
  faster: 100,
  fast: 150,
  normal: 200,
  slow: 300,
  slower: 400,
  slowest: 500,
  verySlow: 800,
  extraSlow: 1000,
} as const;

/**
 * Animation durations in seconds (for CSS)
 */
export const durationSeconds = {
  instant: '0s',
  fastest: '0.05s',
  faster: '0.1s',
  fast: '0.15s',
  normal: '0.2s',
  slow: '0.3s',
  slower: '0.4s',
  slowest: '0.5s',
  verySlow: '0.8s',
  extraSlow: '1s',
} as const;

/**
 * Animation delays in milliseconds
 */
export const delay = {
  none: 0,
  short: 100,
  medium: 200,
  long: 300,
  extraLong: 500,
} as const;

/**
 * Stagger delays for sequential animations
 */
export const stagger = {
  fast: 50,
  normal: 100,
  slow: 150,
} as const;

/**
 * Easing functions (CSS timing functions)
 */
export const easing = {
  // Standard easings
  linear: 'linear',
  ease: 'ease',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',

  // Custom cubic beziers
  easeInQuad: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)',
  easeOutQuad: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  easeInOutQuad: 'cubic-bezier(0.455, 0.03, 0.515, 0.955)',

  easeInCubic: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
  easeOutCubic: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
  easeInOutCubic: 'cubic-bezier(0.645, 0.045, 0.355, 1)',

  easeInQuart: 'cubic-bezier(0.895, 0.03, 0.685, 0.22)',
  easeOutQuart: 'cubic-bezier(0.165, 0.84, 0.44, 1)',
  easeInOutQuart: 'cubic-bezier(0.77, 0, 0.175, 1)',

  // Spring-like easings
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',

  // Smooth easing for UI (from globals.css)
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

/**
 * Predefined animation configurations
 */
export const animations = {
  // Fade animations
  fadeIn: {
    duration: duration.normal,
    easing: easing.easeOut,
  },
  fadeOut: {
    duration: duration.fast,
    easing: easing.easeIn,
  },

  // Scale animations
  scaleIn: {
    duration: duration.normal,
    easing: easing.spring,
  },
  scaleOut: {
    duration: duration.fast,
    easing: easing.easeIn,
  },

  // Slide animations
  slideIn: {
    duration: duration.slow,
    easing: easing.easeOutCubic,
  },
  slideOut: {
    duration: duration.normal,
    easing: easing.easeInCubic,
  },

  // Modal/Dialog animations
  modalEnter: {
    duration: duration.slow,
    easing: easing.easeOutCubic,
  },
  modalExit: {
    duration: duration.normal,
    easing: easing.easeInCubic,
  },

  // Button interactions
  buttonPress: {
    duration: duration.fast,
    easing: easing.easeOut,
  },
  buttonRelease: {
    duration: duration.normal,
    easing: easing.spring,
  },

  // Page transitions
  pageEnter: {
    duration: duration.slower,
    easing: easing.easeOutQuart,
  },
  pageExit: {
    duration: duration.slow,
    easing: easing.easeInQuart,
  },

  // Micro-interactions
  hover: {
    duration: duration.fast,
    easing: easing.smooth,
  },
  focus: {
    duration: duration.normal,
    easing: easing.smooth,
  },
} as const;

/**
 * Overlay-specific timing (from shared-constants)
 */
export const overlayTiming = {
  stagger: 300, // Delay between showing multiple overlays
  transition: 800, // Time to wait for overlay to close before showing next
  reset: 300, // Time to wait before resetting overlay state
} as const;

/**
 * Splash screen timing (from shared-constants)
 */
export const splashTiming = {
  duration: 3000, // How long splash screen shows
  fadeOut: 600, // Fade out animation duration
  fadeIn: 1000, // Fade in animation duration
} as const;

/**
 * Keyframe animation definitions (CSS)
 */
export const keyframes = {
  fadeInUp: `
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  `,
  fadeIn: `
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  `,
  fadeOut: `
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  `,
  pulse: `
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
  `,
  shimmer: `
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  `,
  bounceSubtle: `
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-5px);
    }
  `,
  spin: `
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  `,
  accordionDown: `
    from {
      height: 0;
    }
    to {
      height: var(--radix-accordion-content-height);
    }
  `,
  accordionUp: `
    from {
      height: var(--radix-accordion-content-height);
    }
    to {
      height: 0;
    }
  `,
} as const;

/**
 * Transition presets (CSS transition shorthand values)
 */
export const transitions = {
  none: 'none',
  all: `all ${durationSeconds.normal} ${easing.smooth}`,
  allFast: `all ${durationSeconds.fast} ${easing.smooth}`,
  allSlow: `all ${durationSeconds.slow} ${easing.smooth}`,
  colors: `background-color ${durationSeconds.slow} ${easing.ease}, border-color ${durationSeconds.slow} ${easing.ease}, color ${durationSeconds.slow} ${easing.ease}`,
  opacity: `opacity ${durationSeconds.normal} ${easing.ease}`,
  transform: `transform ${durationSeconds.normal} ${easing.smooth}`,
  shadow: `box-shadow ${durationSeconds.normal} ${easing.ease}`,
} as const;

export type DurationKey = keyof typeof duration;
export type DurationValue = (typeof duration)[DurationKey];
export type EasingKey = keyof typeof easing;
export type EasingValue = (typeof easing)[EasingKey];
export type AnimationKey = keyof typeof animations;
