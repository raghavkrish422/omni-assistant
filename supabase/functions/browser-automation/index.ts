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

// Generate a unique session ID for local tracking
function generateSessionId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, sessionId, url, steps } = await req.json();

    // Create a new "session" - this is now just a local reference for the popup window
    if (action === "create") {
      const newSessionId = generateSessionId();
      
      return new Response(
        JSON.stringify({
          success: true,
          session: {
            sessionId: newSessionId,
            // These URLs are now just markers - actual navigation happens client-side
            debugUrl: null,
            liveUrl: null,
          },
          mode: "guided", // Indicates this is guided automation, not remote browser
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Navigate command - returns the URL for client to open
    if (action === "navigate" && sessionId && url) {
      return new Response(
        JSON.stringify({
          success: true,
          sessionId,
          targetUrl: url,
          mode: "guided",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Execute automation steps - returns steps for client-side guidance
    if (action === "execute" && sessionId && steps) {
      return new Response(
        JSON.stringify({
          success: true,
          sessionId,
          steps,
          mode: "guided",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get session status
    if (action === "status" && sessionId) {
      return new Response(
        JSON.stringify({
          success: true,
          status: {
            id: sessionId,
            state: "active",
            mode: "guided",
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Close session - just acknowledge
    if (action === "close" && sessionId) {
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
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
