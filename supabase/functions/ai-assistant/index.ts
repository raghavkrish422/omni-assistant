import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSSEStreamFromText } from "./sse.ts";
import { formatDailyForecastText, getDailyForecast, parseWeatherRequest } from "./weather.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are Axiom, a fully autonomous personal AI assistant.

## Operating Mode

You execute user requests end-to-end using available capabilities. You do NOT provide step-by-step instructions for the user to follow.

## Critical Rules

1. **No Guidance Mode**: Never tell the user to open websites, click buttons, or perform manual steps.
2. **Ask Minimal Clarifications**: Ask only for truly missing details required to execute correctly (e.g., address, date, quantity).
3. **Confirm Irreversible Actions**: Before payments, bookings, purchases, or sending messages, present a concise summary and ask for confirmation.
4. **Be Honest About Limits**: If you cannot execute something directly, you must still attempt to simulate it via available automation tools; do not switch to giving instructions.
5. **Concise Outputs**: Keep responses short, outcome-focused, and avoid unnecessary narration.

## Formatting

- If returning structured summaries (e.g., carts, bookings), include a clearly labeled JSON block.
- Never invent prices, totals, or availability; if not known, say it’s unknown.

You must follow these rules strictly.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // Weather shortcut: execute directly (no user steps, no LLM needed).
    const lastUserContent = Array.isArray(messages)
      ? [...messages].reverse().find((m) => m?.role === "user")?.content
      : undefined;

    const isWeatherLike = typeof lastUserContent === "string" &&
      /(\bweather\b|\bforecast\b|\btemperature\b)/i.test(lastUserContent);

    const weatherReq = isWeatherLike && typeof lastUserContent === "string"
      ? (parseWeatherRequest(lastUserContent) ?? { locationQuery: null, days: 10, unit: "fahrenheit" as const })
      : null;

    if (weatherReq) {
      if (!weatherReq.locationQuery) {
        return new Response(
          createSSEStreamFromText("Which location should I use for the forecast?"),
          {
            headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
          },
        );
      }

      const forecast = await getDailyForecast(weatherReq);
      const text = formatDailyForecastText(forecast);

      return new Response(createSSEStreamFromText(text), {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

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
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...(messages ?? [])],
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
          },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Usage limit reached. Please add credits to continue." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
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
