import { motion } from "framer-motion";

interface AxiomLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export default function AxiomLogo({ size = "md", showText = false }: AxiomLogoProps) {
  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-16 h-16",
    lg: "w-20 h-20",
  };

  const iconSizes = {
    sm: "w-5 h-5",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.div
        className={`${sizeClasses[size]} rounded-2xl bg-gradient-primary flex items-center justify-center shadow-lg glow-primary relative overflow-hidden`}
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
      >
        {/* Animated glow effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent animate-shimmer" />
        
        {/* Axiom Icon - Abstract intersecting planes representing infinite possibilities */}
        <svg
          viewBox="0 0 32 32"
          fill="none"
          className={`${iconSizes[size]} text-primary-foreground relative z-10`}
        >
          {/* Central core */}
          <circle cx="16" cy="16" r="4" fill="currentColor" opacity="0.9" />
          
          {/* Orbiting rings representing infinite tasks */}
          <ellipse
            cx="16"
            cy="16"
            rx="12"
            ry="5"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            transform="rotate(-30 16 16)"
          />
          <ellipse
            cx="16"
            cy="16"
            rx="12"
            ry="5"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            transform="rotate(30 16 16)"
          />
          <ellipse
            cx="16"
            cy="16"
            rx="12"
            ry="5"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            transform="rotate(90 16 16)"
          />
          
          {/* Corner accent dots */}
          <circle cx="8" cy="8" r="1.5" fill="currentColor" opacity="0.6" />
          <circle cx="24" cy="8" r="1.5" fill="currentColor" opacity="0.6" />
          <circle cx="8" cy="24" r="1.5" fill="currentColor" opacity="0.6" />
          <circle cx="24" cy="24" r="1.5" fill="currentColor" opacity="0.6" />
        </svg>
      </motion.div>
      
      {showText && (
        <motion.span
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-gradient"
        >
          Axiom
        </motion.span>
      )}
    </div>
  );
}
