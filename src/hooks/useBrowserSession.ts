import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AutomationData, AutomationStep } from "@/components/chat/AutomationSteps";

interface BrowserSession {
  sessionId: string;
  debugUrl: string;
  liveUrl: string;
}

interface UseBrowserSessionReturn {
  session: BrowserSession | null;
  isLoading: boolean;
  error: string | null;
  isFallback: boolean;
  currentStepIndex: number;
  createSession: () => Promise<BrowserSession | null>;
  startAutomation: (automation: AutomationData) => Promise<void>;
  closeSession: () => Promise<void>;
}

export function useBrowserSession(): UseBrowserSessionReturn {
  const [session, setSession] = useState<BrowserSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);

  const createSession = useCallback(async (): Promise<BrowserSession | null> => {
    setIsLoading(true);
    setError(null);
    setIsFallback(false);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("browser-automation", {
        body: { action: "create" },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.fallback) {
        setIsFallback(true);
        setError(data.error);
        return null;
      }

      if (data.success && data.session) {
        setSession(data.session);
        return data.session;
      }

      throw new Error("Failed to create browser session");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create session";
      setError(message);
      setIsFallback(true);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startAutomation = useCallback(async (automation: AutomationData) => {
    // First, ensure we have a session
    let currentSession = session;
    if (!currentSession) {
      currentSession = await createSession();
    }

    if (!currentSession) {
      // Fallback mode - open URL in new tab
      window.open(automation.url, "_blank", "noopener,noreferrer");
      return;
    }

    setCurrentStepIndex(0);

    // Navigate to the initial URL
    try {
      await supabase.functions.invoke("browser-automation", {
        body: {
          action: "navigate",
          sessionId: currentSession.sessionId,
          url: automation.url,
        },
      });

      // Simulate step execution
      for (let i = 0; i < automation.steps.length; i++) {
        setCurrentStepIndex(i);
        
        const step = automation.steps[i];
        
        // Handoff steps require user action
        if (step.action === "handoff") {
          break;
        }

        // Execute the step (simulated delay for now)
        await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000));
      }
    } catch (err) {
      console.error("Automation error:", err);
      setError("Automation step failed");
    }
  }, [session, createSession]);

  const closeSession = useCallback(async () => {
    if (!session) return;

    try {
      await supabase.functions.invoke("browser-automation", {
        body: {
          action: "close",
          sessionId: session.sessionId,
        },
      });
    } catch (err) {
      console.error("Failed to close session:", err);
    } finally {
      setSession(null);
      setCurrentStepIndex(-1);
    }
  }, [session]);

  return {
    session,
    isLoading,
    error,
    isFallback,
    currentStepIndex,
    createSession,
    startAutomation,
    closeSession,
  };
}
