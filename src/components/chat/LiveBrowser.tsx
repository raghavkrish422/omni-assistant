import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Maximize2, 
  Minimize2, 
  ExternalLink,
  Loader2,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { AutomationData } from "./AutomationSteps";

interface LiveBrowserProps {
  session: {
    sessionId: string;
    debugUrl: string;
    liveUrl: string;
  } | null;
  automation: AutomationData | null;
  currentStepIndex: number;
  isLoading: boolean;
  error: string | null;
  isFallback: boolean;
  onClose: () => void;
  onRetry: () => void;
  onOpenExternal: () => void;
}

const serviceColors: Record<string, string> = {
  walmart: "from-blue-600 to-blue-700",
  instacart: "from-green-600 to-green-700",
  amazon: "from-orange-500 to-orange-600",
  target: "from-red-600 to-red-700",
  doordash: "from-red-500 to-red-600",
  ubereats: "from-green-500 to-green-600",
  delta: "from-blue-700 to-blue-800",
  uber: "from-gray-900 to-black",
  fandango: "from-orange-600 to-orange-700",
};

export function LiveBrowser({
  session,
  automation,
  currentStepIndex,
  isLoading,
  error,
  isFallback,
  onClose,
  onRetry,
  onOpenExternal,
}: LiveBrowserProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  useEffect(() => {
    // Reset iframe loaded state when session changes
    setIframeLoaded(false);
  }, [session?.sessionId]);

  const serviceName = automation?.service || "Browser";
  const serviceColor = serviceColors[serviceName.toLowerCase()] || "from-primary to-primary/80";

  const currentStep = automation?.steps[currentStepIndex];

  // If fallback mode, render a simple external link prompt
  if (isFallback && automation) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-4 md:inset-8 z-50 bg-card rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className={`bg-gradient-to-r ${serviceColor} px-4 py-3 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white capitalize">
                {serviceName} - Fallback Mode
              </h4>
              <p className="text-xs text-white/80">Live browser not available</p>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Fallback Content */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Live Browser Not Configured</h3>
            <p className="text-muted-foreground mb-6">
              {error || "Browser automation service is not set up. You can still complete the task manually."}
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={onRetry}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
              <Button onClick={onOpenExternal}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Open {serviceName}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed inset-4 md:inset-8 z-50 bg-card rounded-2xl shadow-2xl border border-border overflow-hidden flex items-center justify-center"
      >
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Starting Live Browser...</h3>
          <p className="text-muted-foreground text-sm mt-2">
            Connecting to {serviceName}
          </p>
        </div>
      </motion.div>
    );
  }

  // No session yet
  if (!session) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`fixed z-50 bg-card rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col ${
          isExpanded 
            ? "inset-0 rounded-none" 
            : "inset-4 md:inset-8"
        }`}
      >
        {/* Header */}
        <div className={`bg-gradient-to-r ${serviceColor} px-4 py-3 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <ExternalLink className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white capitalize">
                {serviceName} - Live Automation
              </h4>
              {currentStep && (
                <p className="text-xs text-white/80">
                  Step {currentStepIndex + 1}: {currentStep.target}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-white hover:bg-white/20"
            >
              {isExpanded ? (
                <Minimize2 className="w-5 h-5" />
              ) : (
                <Maximize2 className="w-5 h-5" />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onOpenExternal}
              className="text-white hover:bg-white/20"
            >
              <ExternalLink className="w-5 h-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Browser View */}
        <div className="flex-1 relative bg-muted">
          {!iframeLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Loading browser view...</p>
              </div>
            </div>
          )}
          <iframe
            src={session.liveUrl}
            className="w-full h-full border-0"
            onLoad={() => setIframeLoaded(true)}
            allow="clipboard-read; clipboard-write"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          />
        </div>

        {/* Step Progress Bar */}
        {automation && (
          <div className="px-4 py-3 bg-background/80 backdrop-blur border-t border-border">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {automation.steps.map((step, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${
                    index < currentStepIndex
                      ? "bg-green-500/20 text-green-400"
                      : index === currentStepIndex
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : step.action === "handoff"
                      ? "bg-yellow-500/10 text-yellow-500"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <span className="font-medium">{index + 1}</span>
                  <span className="hidden sm:inline">{step.action}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
