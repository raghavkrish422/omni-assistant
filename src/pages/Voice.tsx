import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { VoiceOrb } from "@/components/voice/VoiceOrb";
import { AudioVisualizer } from "@/components/voice/AudioVisualizer";
import { useVoice } from "@/hooks/useVoice";
import { useChat } from "@/hooks/useChat";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function Voice() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isActive, setIsActive] = useState(false);
  const [lastResponse, setLastResponse] = useState("");
  const { messages, isLoading, sendMessage } = useChat();

  const handleTranscript = useCallback((text: string) => {
    sendMessage(text);
  }, [sendMessage]);

  const handleError = useCallback((error: string) => {
    toast({
      title: "Voice Error",
      description: error,
      variant: "destructive",
    });
  }, [toast]);

  const { isListening, isSpeaking, transcript, startListening, stopListening, speak, stopSpeaking } = useVoice({
    onTranscript: handleTranscript,
    onError: handleError,
  });

  // Speak the last assistant message
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (
      lastMessage?.role === "assistant" &&
      lastMessage.content &&
      lastMessage.status === "complete" &&
      lastMessage.content !== lastResponse &&
      isActive
    ) {
      setLastResponse(lastMessage.content);
      speak(lastMessage.content);
    }
  }, [messages, speak, lastResponse, isActive]);

  // Auto-restart listening after speaking
  useEffect(() => {
    if (isActive && !isSpeaking && !isListening && !isLoading) {
      const timer = setTimeout(() => {
        startListening();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isActive, isSpeaking, isListening, isLoading, startListening]);

  const toggleVoice = () => {
    if (isActive) {
      setIsActive(false);
      stopListening();
      stopSpeaking();
    } else {
      setIsActive(true);
      startListening();
    }
  };

  const getStatusText = () => {
    if (!isActive) return "Tap to start";
    if (isLoading) return "Processing...";
    if (isSpeaking) return "Speaking...";
    if (isListening) return "Listening...";
    return "Ready";
  };

  const lastAssistantMessage = [...messages].reverse().find(m => m.role === "assistant");

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      </div>

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
            <h1 className="text-lg font-semibold text-foreground">Voice</h1>
            <p className="text-xs text-muted-foreground">Speak your request</p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/chat")}
          className="rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground"
        >
          <MessageSquare className="w-5 h-5" />
        </Button>
      </motion.header>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative z-10">
        {/* Voice Orb */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <VoiceOrb
            isActive={isActive}
            isListening={isListening}
            isSpeaking={isSpeaking}
            onClick={toggleVoice}
          />
        </motion.div>

        {/* Audio Visualizer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="h-20 mb-8"
        >
          <AudioVisualizer isActive={isActive} isListening={isListening} />
        </motion.div>

        {/* Status text */}
        <motion.div
          key={getStatusText()}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <p className="text-xl font-medium text-foreground mb-2">{getStatusText()}</p>
          <AnimatePresence mode="wait">
            {transcript && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-muted-foreground italic"
              >
                "{transcript}"
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Last response */}
        <AnimatePresence>
          {lastAssistantMessage && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass rounded-2xl p-6 max-w-md w-full text-center"
            >
              <p className="text-sm text-muted-foreground mb-2">Last response</p>
              <p className="text-foreground line-clamp-4">{lastAssistantMessage.content}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="px-6 py-6 text-center"
      >
        <p className="text-sm text-muted-foreground">
          {isActive
            ? "Speak naturally. I'll listen and respond."
            : "Tap the orb to start a voice conversation"}
        </p>
      </motion.div>
    </div>
  );
}
