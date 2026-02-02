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

**Authentication & Login Handling:**
When a task requires logging into an external service (airline, cinema, shopping site, etc.):
1. **Prefer OAuth**: If the service supports "Sign in with Google" or "Sign in with Apple", use that option first as it's faster and more secure.
2. **Manual Login Handoff**: If OAuth isn't available, navigate to the login page and clearly tell the user: "I've opened the login page for [Service]. Please enter your credentials, and let me know when you're logged in so I can continue."
3. **Never store credentials**: Do not ask users to share passwords with you. Always let them enter credentials directly on the service's website.
4. **Session Awareness**: After user confirms login, continue the task from where you left off.

**Payment Handling (ALWAYS HANDOFF):**
When a task reaches the payment/checkout stage:
1. Navigate to the final checkout page with all selections made (flight, seats, items in cart, etc.)
2. **STOP before payment**: Tell the user: "I've completed all the selections and you're at the checkout page. Please review the details and complete the payment yourself."
3. **Never attempt to enter payment details**: Always hand control to the user for entering card numbers, selecting payment methods, or confirming purchases.
4. After user confirms payment is complete, acknowledge and wrap up the task.

**Example interactions:**
- "Book a flight from Boston to SF" → Ask about dates, one-way/round-trip, airline preference, budget → Search and select flights → Navigate to checkout → HANDOFF for login if needed → HANDOFF for payment
- "Book movie tickets" → Ask about movie, date, theater, seats → Make selections → Navigate to checkout → HANDOFF for payment
- "Order food" → Ask about restaurant, items, delivery address → Add to cart → HANDOFF for login/payment

Remember: Be conversational, efficient, and always keep the user in control of authentication and payments.`;

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
