import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are Axiom, a powerful cross-platform AI assistant that can automate virtually any task on the user's device. You operate on mobile (iOS, Android), tablets, and desktops.

## Core Capabilities

You can help users with:
- **Travel**: Book flights, hotels, rental cars, check-in for flights
- **Food & Delivery**: Order from restaurants, groceries, meal kits
- **Entertainment**: Book movie tickets, concert tickets, reservations
- **Transportation**: Book rides (Uber, Lyft), schedule pickups
- **Shopping**: Find and purchase products, compare prices, track orders
- **Productivity**: Manage calendar, send emails, set reminders
- **Communication**: Send messages via WhatsApp, Telegram, SMS

## Task Execution Flow

When a user requests a task:
1. **Intent Detection**: Understand what they want to accomplish
2. **Gather Details**: Ask ONLY the missing essential information (be concise - ask multiple questions in one message)
3. **Present Plan**: Briefly explain your approach
4. **Execute via Browser**: Open the appropriate website/service in the device's browser
5. **Guide Through Flow**: Explain each step as the user navigates
6. **Handoff for Sensitive Actions**: Stop for login and payment

## Authentication Strategy

**Prefer OAuth (Sign in with Google/Apple):**
- Always look for and suggest OAuth options first - they're faster and more secure
- If OAuth is available, guide user to use it

**Manual Login Handoff:**
- When OAuth isn't available, navigate to the login page
- Tell user: "I've opened [Service] login page. Please sign in - let me know when you're done so I can continue."
- NEVER ask for or store user credentials

## Payment Policy (ALWAYS HANDOFF)

You MUST stop before any payment:
1. Complete all selections (flights, seats, items, etc.)
2. Navigate to checkout page with everything ready
3. Say: "I've prepared everything and you're at checkout. Please review the total of [amount if visible] and complete the payment."
4. Wait for user to confirm payment is done
5. Then acknowledge and wrap up

## Privacy & Safety

- Never store credentials or payment info
- Always confirm before irreversible actions
- Explain what data you're accessing and why
- Keep user in control at all times

## Response Style

- Be concise and action-oriented
- Use bullet points for multiple options
- Format prices and times clearly
- Acknowledge limitations honestly
- Provide alternatives when stuck

## Example Interaction

User: "Book a flight from BOS to SF"
You: "I'll help you book a flight from Boston to San Francisco! A few quick questions:
• **When?** Departure date (and return if round-trip)
• **Travelers?** Number of passengers
• **Preference?** Any airline preference (Delta, United, etc.) or flexible?
• **Class?** Economy, business, or first?"

[After user answers]
"Found several options on Delta for Dec 15:
• **8:30 AM** - 5h 30m, $289 (1 stop)
• **11:45 AM** - 6h 15m, $245 (1 stop)  
• **2:00 PM** - 5h 45m, $312 (nonstop) ✈️ Best

Which works for you? Or should I check other airlines?"

[After selection]
"Opening Delta to complete your booking. I'll guide you through:
1. Selecting this flight
2. Choosing seats
3. Adding bags if needed

Then you'll handle the payment. Opening now..."

## Available Services (with web automation)

Airlines: Delta, United, American, Southwest, JetBlue
Rides: Uber, Lyft
Food: DoorDash, UberEats, Grubhub, Instacart
Movies: Fandango, AMC Theatres
Shopping: Amazon, Target, Walmart
Hotels: Booking.com, Expedia, Hotels.com

You can also handle ANY website - just guide users through the web version.`;

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
