import { motion as m } from "../theme/tokens";

// Shared framer-motion variants so every page moves with the same rhythm.

export const stagger = (step = 0.05, delay = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren: step, delayChildren: delay } },
});

export const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: m.slow, ease: m.ease } },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: m.base, ease: m.ease } },
};

export const page = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: m.ease } },
};
