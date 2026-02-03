import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Mic, LogOut } from "lucide-react";
import { ModeCard } from "@/components/ui/ModeCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import AxiomLogo from "@/components/brand/AxiomLogo";

export default function Home() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
      </div>

      {/* User info & sign out */}
      <div className="absolute top-6 right-6 flex items-center gap-4 z-20">
        {profile && (
          <span className="text-sm text-muted-foreground">
            Hi, <span className="text-foreground font-medium">{profile.first_name}</span>
          </span>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="text-muted-foreground hover:text-foreground"
        >
          <LogOut size={18} className="mr-2" />
          Sign out
        </Button>
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
          <div className="mb-6">
            <AxiomLogo size="lg" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3">
            <span className="text-gradient">Axiom</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-md">
            Your personal AI that does anything. Book flights, order food, manage emails — all in one place.
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
