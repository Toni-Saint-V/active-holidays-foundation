import type { Variants } from "framer-motion";

export const fadeRise: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } }
};

export const staggerParent: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } }
};

export const staggerChild: Variants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } }
};

export const cinematic: Variants = {
  initial: { opacity: 0, scale: 0.96, filter: "blur(8px)" },
  animate: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
  }
};

export const morphPage: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2, ease: "easeOut" } }
};

export const pulseVariants = (amplitude: number): Variants => ({
  initial: { scale: 1, opacity: 0.8 },
  animate: {
    scale: [1, 1 + amplitude * 0.2, 1],
    opacity: [0.8, 1, 0.8],
    transition: { duration: Math.max(1.2, 2 - amplitude), repeat: Infinity, ease: "easeInOut" }
  }
});

export const swipeOut = (direction: "left" | "right" | "up") => ({
  x: direction === "left" ? -320 : direction === "right" ? 320 : 0,
  y: direction === "up" ? -240 : 0,
  opacity: 0,
  rotate: direction === "left" ? -12 : direction === "right" ? 12 : 0,
  transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] }
});
