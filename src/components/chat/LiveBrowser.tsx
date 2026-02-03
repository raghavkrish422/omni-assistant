import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  ExternalLink,
  Loader2,
  CheckCircle,
  Clock,
  Play,
  Monitor
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AutomationData } from "./AutomationSteps";

interface LiveBrowserProps {
  automation: AutomationData | null;
  currentStepIndex: number;
  stepStatuses: Array<"pending" | "running" | "complete" | "waiting">;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
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
  dominos: "from-blue-600 to-red-600",
};

const serviceIcons: Record<string, string> = {
  walmart: "🏪",
  instacart: "🛒",
  amazon: "📦",
  target: "🎯",
  doordash: "🍕",
  ubereats: "🍔",
  delta: "✈️",
  uber: "🚗",
  fandango: "🎬",
  dominos: "🍕",
};

export function LiveBrowser({
  automation,
  currentStepIndex,
  stepStatuses,
  isLoading,
  error,
  onClose,
  onOpenExternal,
}: LiveBrowserProps) {
  if (!automation) return null;

  const serviceName = automation.service || "Browser";
  const serviceColor = serviceColors[serviceName.toLowerCase()] || "from-primary to-primary/80";
  const serviceIcon = serviceIcons[serviceName.toLowerCase()] || "🌐";

  // Loading state
  if (isLoading && currentStepIndex === -1) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-24 right-4 z-50 w-80 bg-card rounded-2xl shadow-2xl border border-border overflow-hidden"
      >
        <div className={`bg-gradient-to-r ${serviceColor} px-4 py-3 flex items-center gap-3`}>
          <Loader2 className="w-5 h-5 text-white animate-spin" />
          <span className="text-white font-medium">Starting automation...</span>
        </div>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="fixed bottom-24 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] bg-card rounded-2xl shadow-2xl border border-border overflow-hidden"
      >
        {/* Header */}
        <div className={`bg-gradient-to-r ${serviceColor} px-4 py-3 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">
              {serviceIcon}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white capitalize flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                {serviceName} Automation
              </h4>
              <p className="text-xs text-white/80">
                Live browser opened in new window
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={onOpenExternal}
              className="text-white hover:bg-white/20 h-8 w-8"
              title="Focus browser window"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              className="text-white hover:bg-white/20 h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Steps Progress */}
        <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
          {automation.steps.map((step, index) => {
            const status = stepStatuses[index] || "pending";
            const isCurrent = index === currentStepIndex;
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-start gap-3 p-3 rounded-xl transition-all ${
                  isCurrent 
                    ? "bg-primary/10 border border-primary/30" 
                    : status === "complete"
                    ? "bg-green-500/10"
                    : status === "waiting"
                    ? "bg-yellow-500/10 border border-yellow-500/30"
                    : "bg-muted/50"
                }`}
              >
                {/* Status Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {status === "complete" ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : status === "running" ? (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  ) : status === "waiting" ? (
                    <Clock className="w-5 h-5 text-yellow-500" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">{index + 1}</span>
                    </div>
                  )}
                </div>

                {/* Step Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${
                    status === "complete" 
                      ? "text-green-400" 
                      : status === "waiting"
                      ? "text-yellow-400"
                      : isCurrent 
                      ? "text-foreground" 
                      : "text-muted-foreground"
                  }`}>
                    {step.action === "handoff" ? "⚠️ " : ""}{step.target}
                  </p>
                  {step.value && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {step.value}
                    </p>
                  )}
                  {status === "waiting" && (
                    <p className="text-xs text-yellow-500 mt-1 font-medium">
                      Complete this step in the browser window
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-muted/50 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Play className="w-3.5 h-3.5" />
            <span>
              Step {Math.min(currentStepIndex + 1, automation.steps.length)} of {automation.steps.length}
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={onOpenExternal}
            className="text-xs h-7"
          >
            <ExternalLink className="w-3 h-3 mr-1.5" />
            Focus Window
          </Button>
        </div>

        {error && (
          <div className="px-4 py-2 bg-destructive/10 border-t border-destructive/30">
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
