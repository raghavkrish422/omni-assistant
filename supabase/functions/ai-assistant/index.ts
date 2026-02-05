import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { createSSEStreamFromText } from "./sse.ts";
import { executeWeatherTool } from "./tools/weather.ts";
import { executeCalculatorTool } from "./tools/calculator.ts";
import { executeFoodOrderTool } from "./tools/food-order.ts";
import { executeTravelSearchTool } from "./tools/travel.ts";
import { executeCalendarTool } from "./tools/calendar.ts";
import { executeMeetingTool } from "./tools/meeting.ts";
import { executeEmailTool } from "./tools/email.ts";
import { executePaymentTool } from "./tools/payment.ts";
import { executeMemoryTool } from "./tools/memory.ts";
import { TOOL_DEFINITIONS } from "./tools/registry.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function buildSystemPrompt(profile: any, preferences: any[]): string {
  const prefMap: Record<string, string> = {};
  for (const p of preferences ?? []) {
    prefMap[p.preference_key] =
      typeof p.preference_value === "string"
        ? p.preference_value
        : JSON.stringify(p.preference_value);
  }

  const userCtx = profile
    ? `\n## User Context\n- Name: ${profile.first_name} ${profile.last_name}\n- Email: ${profile.email}${profile.contact_number ? `\n- Phone: ${profile.contact_number}` : ""}${Object.keys(prefMap).length > 0 ? `\n- Saved Preferences: ${JSON.stringify(prefMap)}` : ""}`
    : "";

  return `You are Axiom, a fully autonomous personal AI assistant.

## Operating Mode
You execute user requests end-to-end using available tools. You NEVER provide step-by-step instructions for the user to follow. You call tools to get real data and perform actions.

## Critical Rules
1. **No Guidance Mode**: Never tell the user to open websites, click buttons, or perform manual steps. Always use tools.
2. **Ask Minimal Clarifications**: Only ask for truly missing details required to execute correctly (e.g., address, date, quantity).
3. **Confirm Irreversible Actions**: Before payments, bookings, purchases, or sending messages, present a concise summary using cart_summary format and ask for confirmation.
4. **Be Honest About Limits**: If you cannot execute something directly, say so clearly — never pretend or switch to guidance mode.
5. **Concise Outputs**: Keep responses short, outcome-focused, and avoid unnecessary narration.
6. **Use Tools Proactively**: For weather, calculations, scheduling, food orders, travel — always call the appropriate tool. Never guess or make up data.
7. **Demo Mode**: Food ordering, travel booking, calendar, meetings, email, and payments operate in demo mode with realistic simulated data. This is transparent to the user for testing.

## Response Formatting
- Use markdown for structured responses (tables, lists, bold)
- For order confirmations, include a \`\`\`cart_summary\`\`\` code block with JSON matching this format: {"items":[{"name":"...","quantity":1,"price":"$X.XX"}],"subtotal":"$X.XX","delivery_fee":"$X.XX","tax":"$X.XX","estimated_total":"$X.XX","store":"Store Name","delivery_time":"XX-XX min"}
- For automation workflows, include a \`\`\`automation\`\`\` code block with JSON
- For receipts after confirmation, include a \`\`\`order_receipt\`\`\` code block
${userCtx}

You must follow these rules strictly. Always call tools instead of guessing.`;
}

/** Collect a streamed SSE response into a full message object */
async function collectStreamedResponse(response: Response): Promise<{
  content: string;
  tool_calls: any[];
}> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let content = "";
  const toolCallsMap: Record<number, { id: string; type: string; function: { name: string; arguments: string } }> = {};
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIdx: number;
    while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, newlineIdx);
      buffer = buffer.slice(newlineIdx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]" || jsonStr === "") continue;

      try {
        const parsed = JSON.parse(jsonStr);
        const delta = parsed.choices?.[0]?.delta;
        if (!delta) continue;

        if (delta.content) content += delta.content;

        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            if (!toolCallsMap[idx]) {
              toolCallsMap[idx] = {
                id: tc.id || `call_${idx}`,
                type: tc.type || "function",
                function: { name: "", arguments: "" },
              };
            }
            if (tc.id) toolCallsMap[idx].id = tc.id;
            if (tc.function?.name) toolCallsMap[idx].function.name += tc.function.name;
            if (tc.function?.arguments) toolCallsMap[idx].function.arguments += tc.function.arguments;
          }
        }
      } catch {
        // Skip malformed chunks
      }
    }
  }

  return {
    content,
    tool_calls: Object.values(toolCallsMap),
  };
}

/** Execute a single tool call and return the result */
async function executeTool(
  name: string,
  args: Record<string, any>,
  userId?: string,
): Promise<string> {
  try {
    switch (name) {
      case "get_weather":
        return await executeWeatherTool(args);
      case "calculate":
        return executeCalculatorTool(args);
      case "search_restaurants":
      case "place_food_order":
        return executeFoodOrderTool(name, args);
      case "search_flights":
      case "search_hotels":
      case "book_travel":
        return executeTravelSearchTool(name, args);
      case "create_calendar_event":
      case "list_calendar_events":
        return executeCalendarTool(name, args);
      case "join_meeting":
      case "get_meeting_summary":
        return executeMeetingTool(name, args);
      case "send_email":
      case "send_message":
        return executeEmailTool(name, args);
      case "process_payment":
        return executePaymentTool(name, args);
      case "save_preference":
      case "get_preferences":
        return await executeMemoryTool(name, args, userId);
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (err) {
    console.error(`Tool ${name} error:`, err);
    return JSON.stringify({
      error: `Tool execution failed: ${err instanceof Error ? err.message : "Unknown error"}`,
    });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Extract user from auth header if present
    let userId: string | undefined;
    let profile: any = null;
    let preferences: any[] = [];

    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      // Only try to get user if token is NOT the anon key (anon key is ~200 chars)
      if (token.length > 250) {
        try {
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
          const { data: { user } } = await supabase.auth.getUser(token);
          if (user) {
            userId = user.id;
            const [profileRes, prefsRes] = await Promise.all([
              supabase.from("profiles").select("*").eq("id", user.id).single(),
              supabase.from("user_preferences").select("*").eq("user_id", user.id),
            ]);
            profile = profileRes.data;
            preferences = prefsRes.data ?? [];
          }
        } catch (e) {
          console.error("Auth lookup error:", e);
        }
      }
    }

    const systemPrompt = buildSystemPrompt(profile, preferences);
    const fullMessages = [
      { role: "system", content: systemPrompt },
      ...(messages ?? []),
    ];

    // First call: let the model decide if it needs tools (streamed, we collect it)
    const firstResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: fullMessages,
          tools: TOOL_DEFINITIONS,
          tool_choice: "auto",
          stream: true,
        }),
      },
    );

    if (!firstResponse.ok) {
      if (firstResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (firstResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Usage limit reached." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const errorText = await firstResponse.text();
      console.error("AI gateway error:", firstResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service error. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Collect the streamed response to check for tool calls
    console.log("Collecting first response stream...");
    const collected = await collectStreamedResponse(firstResponse);
    console.log("Collected:", JSON.stringify({ content_len: collected.content.length, tool_calls: collected.tool_calls.length }));

    // If no tool calls, return the text as SSE stream
    if (collected.tool_calls.length === 0) {
      const text = collected.content || "I'm not sure how to help with that.";
      return new Response(createSSEStreamFromText(text), {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Execute all tool calls in parallel
    console.log("Executing tools:", collected.tool_calls.map(tc => tc.function.name));
    const toolResults = await Promise.all(
      collected.tool_calls.map(async (tc) => {
        let args: Record<string, any>;
        try {
          args = JSON.parse(tc.function.arguments);
        } catch {
          args = {};
        }
        const result = await executeTool(tc.function.name, args, userId);
        console.log(`Tool ${tc.function.name} result length:`, result.length);
        return {
          role: "tool" as const,
          tool_call_id: tc.id,
          content: result,
        };
      }),
    );
    console.log("All tools executed, making second AI call...");

    // Build the assistant message that includes tool_calls for context
    const assistantMessage: any = {
      role: "assistant",
      content: collected.content || null,
      tool_calls: collected.tool_calls.map((tc) => ({
        id: tc.id,
        type: "function",
        function: { name: tc.function.name, arguments: tc.function.arguments },
      })),
    };

    // Second call: let the model generate a response with tool results (streamed)
    const secondMessages = [
      ...fullMessages,
      assistantMessage,
      ...toolResults,
    ];

    const secondResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: secondMessages,
          stream: true,
        }),
      },
    );

    if (!secondResponse.ok) {
      const errorText = await secondResponse.text();
      console.error("AI second call error:", secondResponse.status, errorText);
      // Fall back to just showing the tool results as formatted text
      const fallbackText = toolResults.map((tr) => {
        try {
          const data = JSON.parse(tr.content);
          if (data.error) return `Error: ${data.error}`;
          return JSON.stringify(data, null, 2);
        } catch {
          return tr.content;
        }
      }).join("\n\n");
      return new Response(createSSEStreamFromText(fallbackText), {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Stream the final response directly to the client
    return new Response(secondResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat function error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
