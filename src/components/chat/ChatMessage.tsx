import { motion } from "framer-motion";
import { Bot, User, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { AutomationSteps, parseAutomationBlock, removeAutomationBlock, AutomationData } from "./AutomationSteps";
import { useCallback, useEffect, useState } from "react";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: "thinking" | "complete" | "error" | "confirming" | "automating";
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
  index: number;
}

export function ChatMessage({ message, index }: ChatMessageProps) {
  const isUser = message.role === "user";
  const [automationData, setAutomationData] = useState<AutomationData | null>(null);
  const [displayContent, setDisplayContent] = useState(message.content);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);

  // Parse automation data and simulate step execution
  useEffect(() => {
    const parsed = parseAutomationBlock(message.content);
    if (parsed) {
      setAutomationData(parsed);
      setDisplayContent(removeAutomationBlock(message.content));
      
      // Simulate step execution when message is complete
      if (message.status === "complete") {
        simulateStepExecution(parsed);
      }
    } else {
      setDisplayContent(message.content);
    }
  }, [message.content, message.status]);

  const simulateStepExecution = useCallback((data: AutomationData) => {
    let stepIndex = 0;
    
    const runNextStep = () => {
      if (stepIndex >= data.steps.length) return;
      
      setCurrentStepIndex(stepIndex);
      setAutomationData(prev => {
        if (!prev) return prev;
        const newSteps = [...prev.steps];
        // Mark previous steps as complete
        for (let i = 0; i < stepIndex; i++) {
          newSteps[i] = { ...newSteps[i], status: "complete" };
        }
        // Mark current step as running (or waiting for handoff)
        const currentAction = newSteps[stepIndex].action;
        newSteps[stepIndex] = { 
          ...newSteps[stepIndex], 
          status: currentAction === "handoff" ? "waiting" : "running" 
        };
        return { ...prev, steps: newSteps };
      });

      // Don't auto-advance for handoff steps
      if (data.steps[stepIndex].action === "handoff") {
        // Mark remaining steps and stop
        setAutomationData(prev => {
          if (!prev) return prev;
          const newSteps = [...prev.steps];
          for (let i = 0; i < stepIndex; i++) {
            newSteps[i] = { ...newSteps[i], status: "complete" };
          }
          newSteps[stepIndex] = { ...newSteps[stepIndex], status: "waiting" };
          return { ...prev, steps: newSteps };
        });
        return;
      }

      stepIndex++;
      // Simulate step taking 1-2 seconds
      const delay = 1000 + Math.random() * 1000;
      setTimeout(runNextStep, delay);
    };

    // Start after a brief delay
    setTimeout(runNextStep, 500);
  }, []);

  const handleOpenBrowser = useCallback(() => {
    if (automationData?.url) {
      window.open(automationData.url, "_blank", "noopener,noreferrer");
    }
  }, [automationData?.url]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`flex gap-4 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center shadow-lg">
          <Bot className="w-5 h-5 text-primary-foreground" />
        </div>
      )}

      <div
        className={`max-w-[85%] ${
          isUser
            ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
            : "glass rounded-2xl rounded-bl-md"
        } px-5 py-3`}
      >
        {message.status === "thinking" ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Thinking...</span>
          </div>
        ) : (
          <>
            <div className={`prose prose-sm ${isUser ? "prose-invert" : "prose-invert"} max-w-none`}>
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                  li: ({ children }) => <li className="mb-1">{children}</li>,
                  code: ({ children }) => (
                    <code className="bg-muted/50 px-1.5 py-0.5 rounded text-sm">{children}</code>
                  ),
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                }}
              >
                {displayContent}
              </ReactMarkdown>
            </div>

            {/* Automation Steps Display */}
            {automationData && (
              <AutomationSteps 
                data={automationData} 
                onOpenBrowser={handleOpenBrowser}
              />
            )}
          </>
        )}

        {/* Status indicator for assistant messages */}
        {!isUser && message.status && message.status !== "thinking" && (
          <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-border/30">
            {message.status === "complete" && !automationData && (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                <span className="text-xs text-muted-foreground">Task completed</span>
              </>
            )}
            {message.status === "complete" && automationData && (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                <span className="text-xs text-muted-foreground">Automation ready - browser opened</span>
              </>
            )}
            {message.status === "error" && (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                <span className="text-xs text-destructive">Error occurred</span>
              </>
            )}
            {message.status === "confirming" && (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-xs text-yellow-400">Awaiting confirmation</span>
              </>
            )}
            {message.status === "automating" && (
              <>
                <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                <span className="text-xs text-primary">Automating...</span>
              </>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
          <User className="w-5 h-5 text-foreground" />
        </div>
      )}
    </motion.div>
  );
}
