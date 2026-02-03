import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle2, 
  Circle, 
  Loader2, 
  ExternalLink,
  MapPin,
  Search,
  ShoppingCart,
  MousePointer,
  FileEdit,
  Navigation,
  Hand
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface AutomationStep {
  action: string;
  target: string;
  status: "pending" | "running" | "complete" | "waiting";
}

export interface AutomationData {
  service: string;
  url: string;
  task: string;
  steps: AutomationStep[];
}

interface AutomationStepsProps {
  data: AutomationData;
  onOpenBrowser?: () => void;
}

const actionIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  navigate: Navigation,
  set_location: MapPin,
  search: Search,
  add_to_cart: ShoppingCart,
  select: MousePointer,
  fill: FileEdit,
  click: MousePointer,
  handoff: Hand,
};

const serviceColors: Record<string, string> = {
  walmart: "bg-blue-600",
  instacart: "bg-green-600",
  amazon: "bg-orange-500",
  target: "bg-red-600",
  doordash: "bg-red-500",
  ubereats: "bg-green-500",
  delta: "bg-blue-700",
  uber: "bg-black",
  fandango: "bg-orange-600",
};

export function AutomationSteps({ data, onOpenBrowser }: AutomationStepsProps) {
  const getStepIcon = (step: AutomationStep) => {
    const IconComponent = actionIcons[step.action] || Circle;
    
    if (step.status === "complete") {
      return <CheckCircle2 className="w-5 h-5 text-green-400" />;
    }
    if (step.status === "running") {
      return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
    }
    if (step.status === "waiting") {
      return <IconComponent className="w-5 h-5 text-yellow-400" />;
    }
    return <IconComponent className="w-5 h-5 text-muted-foreground" />;
  };

  const serviceColor = serviceColors[data.service.toLowerCase()] || "bg-primary";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 rounded-xl border border-border/50 bg-card/50 overflow-hidden"
    >
      {/* Header */}
      <div className={`${serviceColor} px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <ExternalLink className="w-4 h-4 text-white" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white capitalize">
              {data.service} Automation
            </h4>
            <p className="text-xs text-white/80">{data.task}</p>
          </div>
        </div>
        
        {onOpenBrowser && (
          <Button
            size="sm"
            variant="secondary"
            onClick={onOpenBrowser}
            className="bg-white/20 hover:bg-white/30 text-white border-0"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open Browser
          </Button>
        )}
      </div>

      {/* Steps */}
      <div className="p-4 space-y-1">
        <AnimatePresence>
          {data.steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-start gap-3 py-2 px-3 rounded-lg transition-colors ${
                step.status === "running" 
                  ? "bg-primary/10 border border-primary/30" 
                  : step.status === "complete"
                  ? "bg-green-500/10"
                  : step.status === "waiting"
                  ? "bg-yellow-500/10 border border-yellow-500/30"
                  : "opacity-60"
              }`}
            >
              <div className="mt-0.5">
                {getStepIcon(step)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${
                  step.status === "complete" 
                    ? "text-green-400" 
                    : step.status === "running"
                    ? "text-foreground font-medium"
                    : step.status === "waiting"
                    ? "text-yellow-400"
                    : "text-muted-foreground"
                }`}>
                  <span className="font-medium">Step {index + 1}:</span>{" "}
                  {step.target}
                </p>
                {step.status === "running" && (
                  <p className="text-xs text-primary mt-1">In progress...</p>
                )}
                {step.status === "waiting" && step.action === "handoff" && (
                  <p className="text-xs text-yellow-400 mt-1">
                    Waiting for you to complete this step
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// Parser function to extract automation data from message content
export function parseAutomationBlock(content: string): AutomationData | null {
  const automationMatch = content.match(/```automation\n([\s\S]*?)\n```/);
  
  if (!automationMatch) {
    return null;
  }

  try {
    const data = JSON.parse(automationMatch[1]);
    return data as AutomationData;
  } catch (e) {
    console.error("Failed to parse automation block:", e);
    return null;
  }
}

// Remove automation block from content for clean display
export function removeAutomationBlock(content: string): string {
  return content.replace(/```automation\n[\s\S]*?\n```/g, "").trim();
}
