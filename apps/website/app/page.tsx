'use client';

import { MotionConfig } from 'motion/react';
import App from '../src/App';

export default function Home() {
  return <MotionConfig reducedMotion="user"><App /></MotionConfig>;
}
