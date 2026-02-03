import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error("TELEGRAM_BOT_TOKEN is not configured");
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const update = await req.json();

    // Handle incoming message
    const message = update.message;
    if (!message || !message.text) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chatId = message.chat.id.toString();
    const userId = message.from.id.toString();
    const text = message.text;
    const displayName = message.from.first_name || message.from.username || "User";

    // Check if this is a /start command with verification
    if (text.startsWith("/start ")) {
      const verificationCode = text.slice(7).trim();
      
      // Find pending connection with this code
      const { data: connection, error: findError } = await supabase
        .from("messaging_connections")
        .select("*")
        .eq("platform", "telegram")
        .eq("verification_code", verificationCode)
        .eq("is_verified", false)
        .single();

      if (connection && !findError) {
        // Verify the connection
        const { error: updateError } = await supabase
          .from("messaging_connections")
          .update({
            platform_user_id: userId,
            chat_id: chatId,
            display_name: displayName,
            is_verified: true,
            verification_code: null,
            verification_expires_at: null,
          })
          .eq("id", connection.id);

        if (!updateError) {
          await sendTelegramMessage(
            TELEGRAM_BOT_TOKEN,
            chatId,
            "✅ *Successfully connected to Axiom!*\n\nYou can now send me any task and I'll help you accomplish it.\n\nTry saying: \"Book a flight from Boston to San Francisco\" or \"Order pizza from Dominos\"",
            { parse_mode: "Markdown" }
          );
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Invalid or expired code
      await sendTelegramMessage(
        TELEGRAM_BOT_TOKEN,
        chatId,
        "❌ Invalid or expired verification code.\n\nPlease generate a new link from the Axiom app settings."
      );
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle regular /start command
    if (text === "/start") {
      await sendTelegramMessage(
        TELEGRAM_BOT_TOKEN,
        chatId,
        "👋 *Welcome to Axiom!*\n\nI'm your personal AI assistant. To get started, please connect your account through the Axiom app:\n\n1. Open Axiom web app\n2. Go to Settings → Messaging\n3. Click \"Connect Telegram\"\n4. Scan the QR code or click the link\n\nOnce connected, you can send me any task!",
        { parse_mode: "Markdown" }
      );
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find verified connection for this user
    const { data: connection, error: connError } = await supabase
      .from("messaging_connections")
      .select("*")
      .eq("platform", "telegram")
      .eq("platform_user_id", userId)
      .eq("is_verified", true)
      .single();

    if (!connection || connError) {
      await sendTelegramMessage(
        TELEGRAM_BOT_TOKEN,
        chatId,
        "⚠️ Your account is not connected.\n\nPlease connect through the Axiom app first:\n1. Open Axiom app\n2. Go to Settings → Messaging\n3. Click \"Connect Telegram\""
      );
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find or create conversation
    let { data: conversation } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", connection.user_id)
      .eq("platform", "telegram")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (!conversation) {
      const { data: newConv, error: convError } = await supabase
        .from("conversations")
        .insert({
          user_id: connection.user_id,
          platform: "telegram",
          title: "Telegram Chat",
        })
        .select()
        .single();

      if (convError) throw convError;
      conversation = newConv;
    }

    // Save user message
    await supabase.from("messages").insert({
      conversation_id: conversation.id,
      role: "user",
      content: text,
      platform_message_id: message.message_id.toString(),
    });

    // Get conversation history
    const { data: history } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true })
      .limit(20);

    // Call AI assistant
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are Axiom, a powerful AI assistant communicating via Telegram. Be concise and mobile-friendly in your responses. Use emojis sparingly for clarity. Format with Telegram's markdown (bold: *text*, italic: _text_, code: \`text\`).

You help users with:
- Booking flights, hotels, restaurants
- Ordering food and groceries
- Managing calendar and tasks
- Shopping and price comparisons
- Any task they need automated

When users request tasks, ask for essential details, then guide them through execution.`,
          },
          ...(history || []),
        ],
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI response failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const assistantContent = aiData.choices?.[0]?.message?.content || "I apologize, I encountered an issue. Please try again.";

    // Save assistant message
    await supabase.from("messages").insert({
      conversation_id: conversation.id,
      role: "assistant",
      content: assistantContent,
    });

    // Update conversation timestamp
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversation.id);

    // Send response to Telegram
    await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, assistantContent, {
      parse_mode: "Markdown",
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function sendTelegramMessage(
  token: string,
  chatId: string,
  text: string,
  options: Record<string, unknown> = {}
) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      ...options,
    }),
  });
}
