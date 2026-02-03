import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare, Shield, Monitor, MonitorOff } from "lucide-react";
import { VoiceOrb } from "@/components/voice/VoiceOrb";
import { AudioVisualizer } from "@/components/voice/AudioVisualizer";
import { useVoice } from "@/hooks/useVoice";
import { useChat } from "@/hooks/useChat";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { PermissionsDialog } from "@/components/permissions/PermissionsDialog";
import { usePermissions } from "@/hooks/usePermissions";
import { useScreenCapture } from "@/hooks/useScreenCapture";

export default function Voice() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [lastResponse, setLastResponse] = useState("");
  const { messages, isLoading, sendMessage } = useChat();
  
  // Permissions
  const [showPermissions, setShowPermissions] = useState(false);
  const { hasShownDialog } = usePermissions();
  
  // Screen capture for meeting recording
  const { 
    isCapturing, 
    transcriptions,
    startCapture, 
    stopCapture,
    generateSummary,
  } = useScreenCapture({
    onTranscription: (segment) => {
      if (segment.isFinal) {
        console.log("Transcription:", segment.text);
      }
    },
    onError: (error) => {
      toast({
        title: "Screen Capture Error",
        description: error,
        variant: "destructive",
      });
    },
  });
  
  // Show permissions on first visit
  useEffect(() => {
    if (!hasShownDialog && profile) {
      const timer = setTimeout(() => setShowPermissions(true), 500);
      return () => clearTimeout(timer);
    }
  }, [hasShownDialog, profile]);

  const userName = profile?.first_name || "there";

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
    if (isCapturing) return "Recording screen...";
    if (!isActive) return "Tap to start";
    if (isLoading) return "Processing...";
    if (isSpeaking) return "Speaking...";
    if (isListening) return "Listening...";
    return "Ready";
  };

  const handleScreenCapture = async () => {
    if (isCapturing) {
      stopCapture();
      const summary = generateSummary();
      toast({
        title: "Recording stopped",
        description: `Captured ${summary.segmentCount} segments over ${Math.round(summary.duration)}s`,
      });
      // Send the transcription to AI for summary
      if (summary.fullTranscript) {
        sendMessage(`Here's the meeting transcript, please provide a summary with key points and action items:\n\n${summary.fullTranscript}`);
      }
    } else {
      const started = await startCapture();
      if (started) {
        toast({
          title: "Recording started",
          description: "Screen and audio are being captured",
        });
      }
    }
  };

  const lastAssistantMessage = [...messages].reverse().find(m => m.role === "assistant");

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Permissions Dialog */}
      <PermissionsDialog
        isOpen={showPermissions}
        onClose={() => setShowPermissions(false)}
        userName={userName}
      />

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
            <p className="text-xs text-muted-foreground">Hi {userName}! Speak your request</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Screen capture button */}
          <Button
            variant={isCapturing ? "default" : "ghost"}
            size="icon"
            onClick={handleScreenCapture}
            className={`rounded-xl ${isCapturing ? "bg-red-500 hover:bg-red-600 text-white" : "hover:bg-muted text-muted-foreground hover:text-foreground"}`}
          >
            {isCapturing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowPermissions(true)}
            className="rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <Shield className="w-5 h-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/chat")}
            className="rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <MessageSquare className="w-5 h-5" />
          </Button>
        </div>
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
          {isCapturing
            ? "Recording your screen. Tap the monitor icon to stop and get summary."
            : isActive
            ? "Speak naturally. I'll listen and respond."
            : "Tap the orb to start a voice conversation"}
        </p>
      </motion.div>
    </div>
  );
}
