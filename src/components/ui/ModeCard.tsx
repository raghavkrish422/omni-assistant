import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface ModeCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
  delay?: number;
}

export function ModeCard({ icon: Icon, title, description, onClick, delay = 0 }: ModeCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group relative w-full max-w-sm p-8 rounded-2xl glass border border-border/50 hover:border-primary/50 transition-all duration-300 cursor-pointer overflow-hidden"
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-radial from-primary/10 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Icon container with glow */}
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl group-hover:bg-primary/30 transition-colors duration-300" />
          <div className="relative w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center shadow-lg group-hover:animate-pulse-glow transition-all duration-300">
            <Icon className="w-10 h-10 text-primary-foreground" strokeWidth={1.5} />
          </div>
        </div>

        {/* Text */}
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-semibold text-foreground group-hover:text-gradient transition-all duration-300">
            {title}
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
            {description}
          </p>
        </div>

        {/* Arrow indicator */}
        <motion.div
          className="flex items-center gap-2 text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          initial={{ x: -10 }}
          whileHover={{ x: 0 }}
        >
          <span className="text-sm font-medium">Get started</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </motion.div>
      </div>
    </motion.button>
  );
}
