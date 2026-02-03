import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AutomationData, AutomationStep } from "@/components/chat/AutomationSteps";

interface BrowserSession {
  sessionId: string;
  popupWindow: Window | null;
}

interface UseBrowserSessionReturn {
  session: BrowserSession | null;
  isLoading: boolean;
  error: string | null;
  currentStepIndex: number;
  stepStatuses: Array<"pending" | "running" | "complete" | "waiting">;
  createSession: () => Promise<BrowserSession | null>;
  startAutomation: (automation: AutomationData) => Promise<void>;
  closeSession: () => Promise<void>;
}

export function useBrowserSession(): UseBrowserSessionReturn {
  const [session, setSession] = useState<BrowserSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [stepStatuses, setStepStatuses] = useState<Array<"pending" | "running" | "complete" | "waiting">>([]);
  const popupRef = useRef<Window | null>(null);

  const createSession = useCallback(async (): Promise<BrowserSession | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("browser-automation", {
        body: { action: "create" },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.success && data.session) {
        const newSession: BrowserSession = {
          sessionId: data.session.sessionId,
          popupWindow: null,
        };
        setSession(newSession);
        return newSession;
      }

      throw new Error("Failed to create browser session");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create session";
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startAutomation = useCallback(async (automation: AutomationData) => {
    setIsLoading(true);
    setError(null);
    
    // Initialize step statuses
    const initialStatuses: Array<"pending" | "running" | "complete" | "waiting"> = 
      automation.steps.map(() => "pending");
    setStepStatuses(initialStatuses);
    setCurrentStepIndex(0);

    try {
      // Create session if needed
      let currentSession = session;
      if (!currentSession) {
        currentSession = await createSession();
      }

      // Open the target URL in a popup window
      const popupWidth = 1200;
      const popupHeight = 800;
      const left = (window.screen.width - popupWidth) / 2;
      const top = (window.screen.height - popupHeight) / 2;
      
      const popup = window.open(
        automation.url,
        `axiom_automation_${Date.now()}`,
        `width=${popupWidth},height=${popupHeight},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
      );
      
      popupRef.current = popup;
      
      if (currentSession) {
        setSession({
          ...currentSession,
          popupWindow: popup,
        });
      }

      // Simulate step execution with timing
      for (let i = 0; i < automation.steps.length; i++) {
        const step = automation.steps[i];
        
        // Update current step
        setCurrentStepIndex(i);
        setStepStatuses(prev => {
          const newStatuses = [...prev];
          // Mark previous steps as complete
          for (let j = 0; j < i; j++) {
            newStatuses[j] = "complete";
          }
          // Mark current step based on action type
          newStatuses[i] = step.action === "handoff" ? "waiting" : "running";
          return newStatuses;
        });

        // Handoff steps require user action - stop automation here
        if (step.action === "handoff") {
          break;
        }

        // Simulate step execution time (1.5-3 seconds per step)
        await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1500));
      }

      // Mark final completed steps
      setStepStatuses(prev => {
        const newStatuses = [...prev];
        for (let i = 0; i < newStatuses.length; i++) {
          if (newStatuses[i] === "running") {
            newStatuses[i] = "complete";
          }
        }
        return newStatuses;
      });

    } catch (err) {
      console.error("Automation error:", err);
      setError("Automation failed");
    } finally {
      setIsLoading(false);
    }
  }, [session, createSession]);

  const closeSession = useCallback(async () => {
    // Close popup if still open
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
    }
    popupRef.current = null;

    if (session) {
      try {
        await supabase.functions.invoke("browser-automation", {
          body: {
            action: "close",
            sessionId: session.sessionId,
          },
        });
      } catch (err) {
        console.error("Failed to close session:", err);
      }
    }

    setSession(null);
    setCurrentStepIndex(-1);
    setStepStatuses([]);
  }, [session]);

  return {
    session,
    isLoading,
    error,
    currentStepIndex,
    stepStatuses,
    createSession,
    startAutomation,
    closeSession,
  };
}
