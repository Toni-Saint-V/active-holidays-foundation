import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";

type Props = {
  value: number;
  fractionDigits?: number;
  suffix?: string;
  className?: string;
};

export function AnimatedNumber({ value, fractionDigits = 0, suffix = "", className }: Props) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (latest) =>
    `${latest.toFixed(fractionDigits)}${suffix}`
  );
  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1]
    });
    return () => controls.stop();
  }, [value, motionValue]);
  return <motion.span className={className}>{rounded}</motion.span>;
}
