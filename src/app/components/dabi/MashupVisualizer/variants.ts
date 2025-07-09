import { Variants } from "framer-motion";

export const wheelVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: ({ boxShadow }: { boxShadow: string }) => ({
    opacity: 1,
    scale: 1,
    boxShadow,
    transition: { type: "spring", stiffness: 300, damping: 30 },
  }),
  exit: { opacity: 0, scale: 0.95 },
};