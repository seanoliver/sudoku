'use client';
import * as m from 'motion/react-m';
import type { HTMLMotionProps } from 'motion/react';
import { SPRINGS } from '@/lib/motion';

/** A button that presses in on the snappy spring. Until Motion's features load it is a plain button. */
export function Pressable(props: HTMLMotionProps<'button'>) {
  return <m.button whileTap={props.disabled ? undefined : { scale: 0.96 }} transition={SPRINGS.snappy} {...props} data-pressable=""/>;
}
