import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2, Shield } from "lucide-react";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { useChat } from "@/hooks/useChat";
import { useBrowserSession } from "@/hooks/useBrowserSession";
import { LiveBrowser } from "@/components/chat/LiveBrowser";
import { AutomationData } from "@/components/chat/AutomationSteps";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { PermissionsDialog } from "@/components/permissions/PermissionsDialog";
import { WelcomeGreeting } from "@/components/assistant/WelcomeGreeting";
import { usePermissions } from "@/hooks/usePermissions";

export default function Chat() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { messages, isLoading, sendMessage, clearMessages } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Permissions state
  const [showPermissions, setShowPermissions] = useState(false);
  const { hasShownDialog } = usePermissions();
  
  // Show permissions dialog on first visit
  useEffect(() => {
    if (!hasShownDialog && profile) {
      const timer = setTimeout(() => setShowPermissions(true), 500);
      return () => clearTimeout(timer);
    }
  }, [hasShownDialog, profile]);
  
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

  const userName = profile?.first_name || "there";

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

  // Handle cart confirmation - send confirmation message to continue automation
  const handleConfirmCart = useCallback(() => {
    sendMessage("Looks good, proceed to checkout");
  }, [sendMessage]);

  // Handle cart modification request
  const handleModifyCart = useCallback(() => {
    sendMessage("I'd like to modify my cart");
  }, [sendMessage]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Permissions Dialog */}
      <PermissionsDialog
        isOpen={showPermissions}
        onClose={() => setShowPermissions(false)}
        userName={userName}
      />

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
            <p className="text-xs text-muted-foreground">Hi {userName}! How can I help?</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowPermissions(true)}
            className="rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <Shield className="w-5 h-5" />
          </Button>
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
        </div>
      </motion.header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 ? (
            <>
              <WelcomeGreeting 
                userName={userName} 
                onManagePermissions={() => setShowPermissions(true)}
                variant="chat"
              />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
                {[
                  "Order groceries from Walmart - show me live",
                  "Record this meeting and give me notes",
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
            </>
          ) : (
            messages.map((message, index) => (
              <ChatMessage 
                key={message.id} 
                message={message} 
                index={index}
                onStartAutomation={handleStartAutomation}
                onConfirmCart={handleConfirmCart}
                onModifyCart={handleModifyCart}
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
