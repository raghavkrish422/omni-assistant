import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { useChat } from "@/hooks/useChat";
import { useBrowserSession } from "@/hooks/useBrowserSession";
import { LiveBrowser } from "@/components/chat/LiveBrowser";
import { AutomationData } from "@/components/chat/AutomationSteps";
import { Button } from "@/components/ui/button";

export default function Chat() {
  const navigate = useNavigate();
  const { messages, isLoading, sendMessage, clearMessages } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Live browser state
  const [activeAutomation, setActiveAutomation] = useState<AutomationData | null>(null);
  const [showLiveBrowser, setShowLiveBrowser] = useState(false);
  
  const {
    session,
    isLoading: isBrowserLoading,
    error: browserError,
    currentStepIndex,
    stepStatuses,
    startAutomation,
    closeSession,
  } = useBrowserSession();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle when automation is triggered from a message
  const handleStartAutomation = useCallback(async (automation: AutomationData) => {
    setActiveAutomation(automation);
    setShowLiveBrowser(true);
    await startAutomation(automation);
  }, [startAutomation]);

  const handleCloseBrowser = useCallback(() => {
    setShowLiveBrowser(false);
    closeSession();
  }, [closeSession]);

  const handleOpenExternal = useCallback(() => {
    if (activeAutomation?.url) {
      window.open(activeAutomation.url, "_blank", "noopener,noreferrer");
    }
  }, [activeAutomation]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Live Browser Panel - Now a floating card */}
      <AnimatePresence>
        {showLiveBrowser && activeAutomation && (
          <LiveBrowser
            automation={activeAutomation}
            currentStepIndex={currentStepIndex}
            stepStatuses={stepStatuses}
            isLoading={isBrowserLoading}
            error={browserError}
            onClose={handleCloseBrowser}
            onOpenExternal={handleOpenExternal}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass border-b border-border/50 px-4 py-4 flex items-center justify-between sticky top-0 z-10"
      >
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="rounded-xl hover:bg-muted"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Chat</h1>
            <p className="text-xs text-muted-foreground">Type your request below</p>
          </div>
        </div>

        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={clearMessages}
            className="rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <Trash2 className="w-5 h-5" />
          </Button>
        )}
      </motion.header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
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
                How can I help you today?
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Tell me what you'd like to accomplish. I'll open a live browser and 
                automate the task for you - you just complete login and payment.
              </p>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
                {[
                  "Order groceries from Walmart - show me live",
                  "Book a flight from Boston to San Francisco",
                  "Order dinner from DoorDash",
                  "Find the cheapest option for 1lb potatoes",
                ].map((suggestion, index) => (
                  <motion.button
                    key={suggestion}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                    onClick={() => sendMessage(suggestion)}
                    className="glass rounded-xl px-4 py-3 text-sm text-left text-muted-foreground hover:text-foreground hover:border-primary/50 border border-transparent transition-all duration-200"
                  >
                    {suggestion}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            messages.map((message, index) => (
              <ChatMessage 
                key={message.id} 
                message={message} 
                index={index}
                onStartAutomation={handleStartAutomation}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border/50 bg-background/80 backdrop-blur-xl px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <ChatInput
            onSend={sendMessage}
            isLoading={isLoading}
            placeholder="Describe what you'd like to accomplish..."
          />
        </div>
      </div>
    </div>
  );
}
