'use client';
import { LazyMotion, MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';

const features = () => import('./motion-features').then(module => module.default);

/** Loads Motion's layout and drag features after first render, and switches off transform animations for reduced motion. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <LazyMotion features={features} strict><MotionConfig reducedMotion="user">{children}</MotionConfig></LazyMotion>;
}
