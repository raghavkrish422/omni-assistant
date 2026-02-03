import { motion } from "framer-motion";
import { Settings, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WelcomeGreetingProps {
  userName: string;
  onManagePermissions: () => void;
  variant?: "chat" | "voice";
}

export function WelcomeGreeting({ userName, onManagePermissions, variant = "chat" }: WelcomeGreetingProps) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  if (variant === "voice") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          {getGreeting()}, {userName}!
        </h2>
        <p className="text-muted-foreground">
          Tap the orb and tell me what you'd like to do
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={onManagePermissions}
          className="mt-4 text-muted-foreground hover:text-foreground"
        >
          <Shield className="w-4 h-4 mr-2" />
          Manage Permissions
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-12"
    >
      <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-6 shadow-lg">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="w-8 h-8 text-primary-foreground"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </div>
      
      <h2 className="text-2xl font-semibold text-foreground mb-2">
        {getGreeting()}, {userName}!
      </h2>
      <p className="text-muted-foreground max-w-md mx-auto mb-6">
        I'm your personal assistant. Tell me what you'd like to accomplish - 
        I can order food, book services, record meetings, and much more.
      </p>

      <Button
        variant="outline"
        size="sm"
        onClick={onManagePermissions}
        className="rounded-xl"
      >
        <Shield className="w-4 h-4 mr-2" />
        Manage Permissions
      </Button>
    </motion.div>
  );
}
