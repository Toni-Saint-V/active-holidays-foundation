import { motion } from "framer-motion";
import { Button } from "./primitives";
import { GitBranch } from "lucide-react";

export function ForkDivider({ onFork, disabled }: { onFork: () => void; disabled?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="relative my-3 flex items-center justify-center"
    >
      <span className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
      <Button size="sm" variant="secondary" onClick={onFork} disabled={disabled} leadingIcon={<GitBranch className="h-3 w-3" />}>
        Сравнить в отдельной ветке
      </Button>
    </motion.div>
  );
}
