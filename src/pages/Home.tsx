import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Mic } from "lucide-react";
import { ModeCard } from "@/components/ui/ModeCard";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center max-w-4xl mx-auto">
        {/* Logo / Brand */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-6 shadow-lg glow-primary">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="w-10 h-10 text-primary-foreground"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </motion.div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3">
            <span className="text-gradient">Agentic</span> AI
          </h1>
          <p className="text-lg text-muted-foreground max-w-md">
            Your intelligent assistant for everyday tasks. Just tell me what you need.
          </p>
        </motion.div>

        {/* Mode Selection */}
        <div className="flex flex-col md:flex-row gap-6 w-full justify-center">
          <ModeCard
            icon={MessageSquare}
            title="Chat"
            description="Type your requests and I'll help you complete tasks step by step"
            onClick={() => navigate("/chat")}
            delay={0.2}
          />
          <ModeCard
            icon={Mic}
            title="Voice"
            description="Speak naturally and I'll listen, understand, and take action"
            onClick={() => navigate("/voice")}
            delay={0.3}
          />
        </div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 text-sm text-muted-foreground text-center"
        >
          Privacy-first • No credential storage • You're always in control
        </motion.p>
      </div>
    </div>
  );
}
