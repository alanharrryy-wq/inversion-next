// src/system/motion.ts
import { useReducedMotion } from "framer-motion";

/**
 * Motion Baseline (Executive, restrained)
 * Strategic Canon ID: HITECH_RTS_EXEC_CANON_V1
 */

export const Motion = {
  ease: [0.2, 0.8, 0.2, 1] as const,
  fast: 0.16,
  base: 0.26,
  slow: 0.52,
} as const;

export function useExecutiveMotion() {
  const reduced = useReducedMotion();
  const t = (sec: number) => (reduced ? 0 : sec);

  return {
    reduced,
    transitionFast: { duration: t(Motion.fast), ease: Motion.ease },
    transitionBase: { duration: t(Motion.base), ease: Motion.ease },
    transitionSlow: { duration: t(Motion.slow), ease: Motion.ease },
  };
}
