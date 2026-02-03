import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle webhook verification (GET request from Meta)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const WHATSAPP_VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN");

    if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
      console.log("WhatsApp webhook verified");
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const WHATSAPP_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_ID");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_ID) {
      throw new Error("WhatsApp credentials not configured");
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();

    // Process incoming messages
    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field !== "messages") continue;

        const messages = change.value?.messages || [];
        for (const message of messages) {
          if (message.type !== "text") continue;

          const phone = message.from;
          const text = message.text?.body;
          const messageId = message.id;
          const contactName = change.value?.contacts?.[0]?.profile?.name || "User";

          if (!text) continue;

          // Check if message contains verification code
          if (text.toLowerCase().startsWith("verify:")) {
            const verificationCode = text.slice(7).trim();
            await handleVerification(supabase, phone, verificationCode, contactName, WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_ID);
            continue;
          }

          // Find verified connection
          const { data: connection, error: connError } = await supabase
            .from("messaging_connections")
            .select("*")
            .eq("platform", "whatsapp")
            .eq("phone_number", phone)
            .eq("is_verified", true)
            .single();

          if (!connection || connError) {
            await sendWhatsAppMessage(
              WHATSAPP_ACCESS_TOKEN,
              WHATSAPP_PHONE_ID,
              phone,
              "⚠️ Your WhatsApp is not connected to Axiom.\n\nTo connect:\n1. Open the Axiom web app\n2. Go to Settings → Messaging\n3. Click \"Connect WhatsApp\"\n4. Enter your phone number\n5. Reply here with the verification code: VERIFY:<code>"
            );
            continue;
          }

          // Find or create conversation
          let { data: conversation } = await supabase
            .from("conversations")
            .select("*")
            .eq("user_id", connection.user_id)
            .eq("platform", "whatsapp")
            .order("updated_at", { ascending: false })
            .limit(1)
            .single();

          if (!conversation) {
            const { data: newConv, error: convError } = await supabase
              .from("conversations")
              .insert({
                user_id: connection.user_id,
                platform: "whatsapp",
                title: "WhatsApp Chat",
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
            platform_message_id: messageId,
          });

          // Get conversation history
          const { data: history } = await supabase
            .from("messages")
            .select("role, content")
            .eq("conversation_id", conversation.id)
            .order("created_at", { ascending: true })
            .limit(20);

          // Call AI
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
                  content: `You are Axiom, a powerful AI assistant communicating via WhatsApp. Be concise and mobile-friendly. Use emojis sparingly.

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

          // Update conversation
          await supabase
            .from("conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", conversation.id);

          // Send response
          await sendWhatsAppMessage(WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_ID, phone, assistantContent);
        }
      }
    }

    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function handleVerification(
  // deno-lint-ignore no-explicit-any
  supabaseClient: any,
  phone: string,
  code: string,
  displayName: string,
  accessToken: string,
  phoneId: string
) {
  const { data: connection, error } = await supabaseClient
    .from("messaging_connections")
    .select("*")
    .eq("platform", "whatsapp")
    .eq("verification_code", code)
    .eq("is_verified", false)
    .single();

  if (connection && !error) {
    await supabaseClient
      .from("messaging_connections")
      .update({
        phone_number: phone,
        platform_user_id: phone,
        display_name: displayName,
        is_verified: true,
        verification_code: null,
        verification_expires_at: null,
      })
      .eq("id", connection.id);

    await sendWhatsAppMessage(
      accessToken,
      phoneId,
      phone,
      "✅ *Successfully connected to Axiom!*\n\nYou can now send me any task and I'll help you accomplish it.\n\nTry: \"Book a flight from Boston to SF\" or \"Order groceries\""
    );
  } else {
    await sendWhatsAppMessage(
      accessToken,
      phoneId,
      phone,
      "❌ Invalid or expired code. Please generate a new one from the Axiom app."
    );
  }
}

async function sendWhatsAppMessage(
  accessToken: string,
  phoneId: string,
  to: string,
  text: string
) {
  await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });
}
