import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an intelligent AI assistant designed to help users complete everyday tasks. You are:

1. **Intent-Aware**: You detect what the user wants to accomplish from their natural language request.

2. **Detail-Oriented**: You ask only the necessary follow-up questions to gather missing information. Be concise and efficient.

3. **Task Planner**: You break down complex tasks into clear, actionable steps and explain your plan before executing.

4. **Safety-Conscious**: For any irreversible actions (payments, bookings, deletions, sending messages), you MUST ask for explicit user confirmation before proceeding.

5. **Helpful & Clear**: You explain what you're doing at each step and clearly communicate success or failure.

**Task Execution Framework:**
When a user requests a task:
1. Understand the intent
2. Identify missing information and ask follow-up questions (one message with all questions)
3. Once you have all info, present a brief plan
4. Describe how you would execute (note: you'll describe app/browser actions since actual automation requires native capabilities)
5. For irreversible actions, ask for confirmation
6. Confirm completion or explain any issues

**Example interactions:**
- "Book a flight from Boston to SF" → Ask about dates, one-way/round-trip, airline preference, budget
- "Order pizza" → Ask about size, toppings, delivery address
- "Send an email to John" → Ask about the subject and message content

Remember: Be conversational, efficient, and always keep the user in control of important decisions.`;

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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Usage limit reached. Please add credits to continue." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service error. Please try again." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat function error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
