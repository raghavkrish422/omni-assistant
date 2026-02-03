// Task status indicator component for showing AI automation progress
import { motion } from "framer-motion";
import { Loader2, ExternalLink, CreditCard, LogIn, CheckCircle2, AlertCircle } from "lucide-react";
import type { TaskStatus } from "@/lib/capacitor/task-executor";

interface TaskStatusIndicatorProps {
  status: TaskStatus;
  service?: string;
  onOpenBrowser?: () => void;
}

const statusConfig: Record<TaskStatus, {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}> = {
  planning: {
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  navigating: {
    icon: <ExternalLink className="w-4 h-4" />,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
  },
  waiting_login: {
    icon: <LogIn className="w-4 h-4" />,
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
  },
  waiting_action: {
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  waiting_payment: {
    icon: <CreditCard className="w-4 h-4" />,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
  },
  complete: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: "text-green-400",
    bgColor: "bg-green-500/10",
  },
  error: {
    icon: <AlertCircle className="w-4 h-4" />,
    color: "text-red-400",
    bgColor: "bg-red-500/10",
  },
};

const statusMessages: Record<TaskStatus, (service?: string) => string> = {
  planning: () => "Planning your task...",
  navigating: (service) => `Opening ${service || 'the service'}...`,
  waiting_login: () => "Please log in to continue",
  waiting_action: () => "Waiting for your selection...",
  waiting_payment: () => "Please complete the payment",
  complete: () => "Task completed!",
  error: () => "Something went wrong",
};

export function TaskStatusIndicator({ status, service, onOpenBrowser }: TaskStatusIndicatorProps) {
  const config = statusConfig[status];
  const message = statusMessages[status](service);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl ${config.bgColor} border border-white/5`}
    >
      <div className={config.color}>
        {config.icon}
      </div>
      
      <div className="flex-1">
        <p className={`text-sm font-medium ${config.color}`}>
          {message}
        </p>
        {status === 'waiting_login' && (
          <p className="text-xs text-muted-foreground mt-1">
            Let me know when you're logged in so I can continue
          </p>
        )}
        {status === 'waiting_payment' && (
          <p className="text-xs text-muted-foreground mt-1">
            I've prepared everything - just complete the checkout
          </p>
        )}
      </div>
      
      {(status === 'navigating' || status === 'waiting_action') && onOpenBrowser && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onOpenBrowser}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        >
          <ExternalLink className="w-4 h-4 text-muted-foreground" />
        </motion.button>
      )}
    </motion.div>
  );
}
