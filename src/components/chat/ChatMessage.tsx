import { motion } from "framer-motion";
import { Bot, User, CheckCircle, AlertCircle, Loader2, Play } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { AutomationSteps, parseAutomationBlock, removeAutomationBlock, AutomationData } from "./AutomationSteps";
import { CartSummary, parseCartSummary, CartSummaryData } from "./CartSummary";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

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
  onStartAutomation?: (automation: AutomationData) => void;
  onConfirmCart?: () => void;
  onModifyCart?: () => void;
}

export function ChatMessage({ message, index, onStartAutomation, onConfirmCart, onModifyCart }: ChatMessageProps) {
  const isUser = message.role === "user";
  const [automationStarted, setAutomationStarted] = useState(false);
  const [automationData, setAutomationData] = useState<AutomationData | null>(null);
  const [cartData, setCartData] = useState<CartSummaryData | null>(null);
  const [displayContent, setDisplayContent] = useState(message.content);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [isAwaitingConfirmation, setIsAwaitingConfirmation] = useState(false);

  // Parse automation data and cart summary
  useEffect(() => {
    const parsedAutomation = parseAutomationBlock(message.content);
    const parsedCart = parseCartSummary(message.content);
    
    let cleanContent = message.content;
    
    if (parsedAutomation) {
      setAutomationData(parsedAutomation);
      cleanContent = removeAutomationBlock(cleanContent);
    }
    
    if (parsedCart) {
      setCartData(parsedCart);
      // Remove cart_summary block from display
      cleanContent = cleanContent.replace(/```cart_summary[\s\S]*?```/g, '').trim();
    }
    
    setDisplayContent(cleanContent);
    
    // Simulate step execution when message is complete
    if (parsedAutomation && message.status === "complete") {
      simulateStepExecution(parsedAutomation);
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
        // Mark current step as running (or waiting for handoff/confirmation)
        const currentAction = newSteps[stepIndex].action;
        const needsWait = currentAction === "handoff" || currentAction === "await_confirmation";
        newSteps[stepIndex] = { 
          ...newSteps[stepIndex], 
          status: needsWait ? "waiting" : "running" 
        };
        return { ...prev, steps: newSteps };
      });

      // Don't auto-advance for handoff or await_confirmation steps
      const currentAction = data.steps[stepIndex].action;
      if (currentAction === "handoff" || currentAction === "await_confirmation") {
        if (currentAction === "await_confirmation") {
          setIsAwaitingConfirmation(true);
        }
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

  const handleStartLiveAutomation = useCallback(() => {
    if (automationData && onStartAutomation && !automationStarted) {
      setAutomationStarted(true);
      onStartAutomation(automationData);
    }
  }, [automationData, onStartAutomation, automationStarted]);

  const handleConfirmCart = useCallback(() => {
    setIsAwaitingConfirmation(false);
    // Continue automation from await_confirmation step
    if (automationData) {
      const confirmIdx = automationData.steps.findIndex(s => s.action === "await_confirmation");
      if (confirmIdx !== -1) {
        setAutomationData(prev => {
          if (!prev) return prev;
          const newSteps = [...prev.steps];
          newSteps[confirmIdx] = { ...newSteps[confirmIdx], status: "complete" };
          return { ...prev, steps: newSteps };
        });
        // Simulate remaining steps
        let stepIndex = confirmIdx + 1;
        const runRemainingSteps = () => {
          if (stepIndex >= automationData.steps.length) return;
          
          setAutomationData(prev => {
            if (!prev) return prev;
            const newSteps = [...prev.steps];
            const currentAction = newSteps[stepIndex].action;
            newSteps[stepIndex] = { 
              ...newSteps[stepIndex], 
              status: currentAction === "handoff" ? "waiting" : "running" 
            };
            return { ...prev, steps: newSteps };
          });
          
          if (automationData.steps[stepIndex].action === "handoff") {
            setAutomationData(prev => {
              if (!prev) return prev;
              const newSteps = [...prev.steps];
              newSteps[stepIndex] = { ...newSteps[stepIndex], status: "waiting" };
              return { ...prev, steps: newSteps };
            });
            return;
          }
          
          setTimeout(() => {
            setAutomationData(prev => {
              if (!prev) return prev;
              const newSteps = [...prev.steps];
              newSteps[stepIndex] = { ...newSteps[stepIndex], status: "complete" };
              return { ...prev, steps: newSteps };
            });
            stepIndex++;
            runRemainingSteps();
          }, 1000 + Math.random() * 1000);
        };
        
        setTimeout(runRemainingSteps, 500);
      }
    }
    onConfirmCart?.();
  }, [automationData, onConfirmCart]);

  const handleModifyCart = useCallback(() => {
    onModifyCart?.();
  }, [onModifyCart]);

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

            {/* Cart Summary Display */}
            {cartData && (
              <div className="mt-4">
                <CartSummary
                  cart={cartData}
                  onConfirm={handleConfirmCart}
                  onModify={handleModifyCart}
                  isWaiting={isAwaitingConfirmation}
                />
              </div>
            )}

            {/* Automation Steps Display */}
            {automationData && (
              <>
                {/* Start Live Automation Button */}
                {onStartAutomation && !automationStarted && (
                  <div className="mt-4 mb-2">
                    <Button
                      onClick={handleStartLiveAutomation}
                      className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-medium"
                      size="lg"
                    >
                      <Play className="w-5 h-5 mr-2" />
                      Start Live Browser Automation
                    </Button>
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Watch as Axiom automates this task in real-time
                    </p>
                  </div>
                )}
                
                <AutomationSteps 
                  data={automationData} 
                  onOpenBrowser={handleOpenBrowser}
                />
              </>
            )}
          </>
        )}

        {/* Status indicator for assistant messages */}
        {!isUser && message.status && message.status !== "thinking" && (
          <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-border/30">
            {message.status === "complete" && !automationData && !isAwaitingConfirmation && (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                <span className="text-xs text-muted-foreground">Task completed</span>
              </>
            )}
            {message.status === "complete" && automationData && !isAwaitingConfirmation && (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                <span className="text-xs text-muted-foreground">Automation ready - browser opened</span>
              </>
            )}
            {isAwaitingConfirmation && (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
                <span className="text-xs text-yellow-400">Waiting for your confirmation to proceed</span>
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
