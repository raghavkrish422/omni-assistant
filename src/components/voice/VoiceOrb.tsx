import { motion } from "framer-motion";
import { Mic, MicOff, Volume2 } from "lucide-react";

interface VoiceOrbProps {
  isActive: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  onClick: () => void;
}

export function VoiceOrb({ isActive, isListening, isSpeaking, onClick }: VoiceOrbProps) {
  const getIcon = () => {
    if (!isActive) return <Mic className="w-12 h-12" />;
    if (isSpeaking) return <Volume2 className="w-12 h-12" />;
    if (isListening) return <Mic className="w-12 h-12" />;
    return <MicOff className="w-12 h-12" />;
  };

  return (
    <div className="relative">
      {/* Pulse rings when active */}
      {isActive && (
        <>
          <motion.div
            animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
            className="absolute inset-0 rounded-full bg-primary/30"
          />
          <motion.div
            animate={{ scale: [1, 1.3], opacity: [0.3, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.3 }}
            className="absolute inset-0 rounded-full bg-primary/20"
          />
        </>
      )}

      {/* Main orb */}
      <motion.button
        onClick={onClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={{
          boxShadow: isActive
            ? [
                "0 0 30px hsl(16 90% 58% / 0.4)",
                "0 0 60px hsl(16 90% 58% / 0.6)",
                "0 0 30px hsl(16 90% 58% / 0.4)",
              ]
            : "0 0 20px hsl(16 90% 58% / 0.2)",
        }}
        transition={{
          boxShadow: { duration: 2, repeat: isActive ? Infinity : 0, ease: "easeInOut" },
        }}
        className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
          isActive
            ? "bg-gradient-primary text-primary-foreground"
            : "glass border border-border/50 text-foreground hover:border-primary/50"
        }`}
      >
        <motion.div
          animate={{ scale: isActive && isListening ? [1, 1.1, 1] : 1 }}
          transition={{ duration: 0.5, repeat: isActive && isListening ? Infinity : 0 }}
        >
          {getIcon()}
        </motion.div>
      </motion.button>
    </div>
  );
}
