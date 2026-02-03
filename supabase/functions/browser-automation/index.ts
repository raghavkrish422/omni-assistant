import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AutomationStep {
  action: string;
  target: string;
  value?: string;
}

interface BrowserSession {
  sessionId: string;
  debugUrl: string;
  liveUrl: string;
}

// Create a new browser session with Browserbase
async function createSession(apiKey: string, projectId: string): Promise<BrowserSession> {
  const response = await fetch("https://www.browserbase.com/v1/sessions", {
    method: "POST",
    headers: {
      "x-bb-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      projectId: projectId,
      browserSettings: {
        viewport: {
          width: 1280,
          height: 800,
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Browserbase session creation failed:", error);
    throw new Error(`Failed to create browser session: ${response.status}`);
  }

  const session = await response.json();
  
  return {
    sessionId: session.id,
    debugUrl: `https://www.browserbase.com/devtools/inspector.html?wss=connect.browserbase.com?sessionId=${session.id}&apiKey=${apiKey}`,
    liveUrl: `https://www.browserbase.com/sessions/${session.id}/live`,
  };
}

// Get the CDP websocket endpoint for a session
async function getConnectUrl(apiKey: string, sessionId: string): Promise<string> {
  return `wss://connect.browserbase.com?apiKey=${apiKey}&sessionId=${sessionId}`;
}

// Execute automation steps using Playwright-like commands via CDP
async function executeStep(
  wsUrl: string,
  step: AutomationStep,
  pageId: string
): Promise<{ success: boolean; error?: string }> {
  // This would use the Chrome DevTools Protocol to execute actions
  // For now, we return the step info for client-side execution
  return { success: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BROWSERBASE_API_KEY = Deno.env.get("BROWSERBASE_API_KEY");
    const BROWSERBASE_PROJECT_ID = Deno.env.get("BROWSERBASE_PROJECT_ID");

    if (!BROWSERBASE_API_KEY || !BROWSERBASE_PROJECT_ID) {
      console.error("Browserbase credentials not configured");
      return new Response(
        JSON.stringify({ 
          error: "Browser automation not configured. Please add BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID secrets.",
          fallback: true 
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { action, sessionId, url, steps } = await req.json();

    // Create a new session
    if (action === "create") {
      const session = await createSession(BROWSERBASE_API_KEY, BROWSERBASE_PROJECT_ID);
      
      return new Response(
        JSON.stringify({
          success: true,
          session,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Navigate to a URL
    if (action === "navigate" && sessionId && url) {
      const wsUrl = await getConnectUrl(BROWSERBASE_API_KEY, sessionId);
      
      // Return the websocket URL for client-side navigation
      return new Response(
        JSON.stringify({
          success: true,
          wsUrl,
          targetUrl: url,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Execute automation steps
    if (action === "execute" && sessionId && steps) {
      const wsUrl = await getConnectUrl(BROWSERBASE_API_KEY, sessionId);
      
      // Return connection info for step execution
      return new Response(
        JSON.stringify({
          success: true,
          wsUrl,
          steps,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get session status
    if (action === "status" && sessionId) {
      const response = await fetch(`https://www.browserbase.com/v1/sessions/${sessionId}`, {
        headers: {
          "x-bb-api-key": BROWSERBASE_API_KEY,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get session status: ${response.status}`);
      }

      const status = await response.json();
      
      return new Response(
        JSON.stringify({
          success: true,
          status,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Close session
    if (action === "close" && sessionId) {
      await fetch(`https://www.browserbase.com/v1/sessions/${sessionId}`, {
        method: "DELETE",
        headers: {
          "x-bb-api-key": BROWSERBASE_API_KEY,
        },
      });
      
      return new Response(
        JSON.stringify({ success: true }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Browser automation error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        fallback: true,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
