import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface AudioVisualizerProps {
  isActive: boolean;
  isListening: boolean;
}

export function AudioVisualizer({ isActive, isListening }: AudioVisualizerProps) {
  const [bars, setBars] = useState<number[]>(Array(5).fill(0.3));

  useEffect(() => {
    if (!isActive) {
      setBars(Array(5).fill(0.3));
      return;
    }

    const interval = setInterval(() => {
      setBars(prev => prev.map(() => 
        isListening 
          ? 0.3 + Math.random() * 0.7 
          : 0.5 + Math.random() * 0.5
      ));
    }, 100);

    return () => clearInterval(interval);
  }, [isActive, isListening]);

  return (
    <div className="flex items-center justify-center gap-1.5 h-16">
      {bars.map((height, index) => (
        <motion.div
          key={index}
          animate={{ 
            scaleY: isActive ? height : 0.3,
            opacity: isActive ? 1 : 0.5
          }}
          transition={{ 
            duration: 0.1,
            ease: "easeOut"
          }}
          className={`w-2 h-full rounded-full origin-center ${
            isListening ? "bg-primary" : "bg-gradient-primary"
          }`}
          style={{ maxHeight: "100%" }}
        />
      ))}
    </div>
  );
}
