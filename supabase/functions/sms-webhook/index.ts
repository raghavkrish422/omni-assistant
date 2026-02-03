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
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      throw new Error("Twilio credentials not configured");
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Twilio sends form-urlencoded data
    const formData = await req.formData();
    const from = formData.get("From")?.toString() || "";
    const body = formData.get("Body")?.toString() || "";
    const messageSid = formData.get("MessageSid")?.toString() || "";

    if (!from || !body) {
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    // Normalize phone number
    const phone = from.replace(/\D/g, "");

    // Check for verification code
    if (body.toLowerCase().startsWith("verify:")) {
      const code = body.slice(7).trim();
      await handleVerification(
        supabase,
        phone,
        code,
        TWILIO_ACCOUNT_SID,
        TWILIO_AUTH_TOKEN,
        TWILIO_PHONE_NUMBER,
        from
      );
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    // Find verified connection
    const { data: connection, error: connError } = await supabase
      .from("messaging_connections")
      .select("*")
      .eq("platform", "sms")
      .eq("phone_number", phone)
      .eq("is_verified", true)
      .single();

    if (!connection || connError) {
      await sendSMS(
        TWILIO_ACCOUNT_SID,
        TWILIO_AUTH_TOKEN,
        TWILIO_PHONE_NUMBER,
        from,
        "Your phone is not connected to Axiom. To connect: 1) Open Axiom app 2) Go to Settings > Messaging 3) Click Connect SMS 4) Enter your phone 5) Reply VERIFY:<code>"
      );
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    // Find or create conversation
    let { data: conversation } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", connection.user_id)
      .eq("platform", "sms")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (!conversation) {
      const { data: newConv, error: convError } = await supabase
        .from("conversations")
        .insert({
          user_id: connection.user_id,
          platform: "sms",
          title: "SMS Chat",
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
      content: body,
      platform_message_id: messageSid,
    });

    // Get conversation history
    const { data: history } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true })
      .limit(15); // SMS is more limited, keep history shorter

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
            content: `You are Axiom, an AI assistant via SMS. Be VERY concise (SMS has 160 char limit per segment). No emojis or formatting.

Help with: flights, hotels, food orders, shopping, tasks.

Ask minimal questions. Give brief answers. Split long responses if needed.`,
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
    const assistantContent = aiData.choices?.[0]?.message?.content || "Error. Please try again.";

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

    // Send response via SMS
    await sendSMS(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, from, assistantContent);

    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { "Content-Type": "text/xml" } }
    );
  } catch (error) {
    console.error("SMS webhook error:", error);
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { "Content-Type": "text/xml" } }
    );
  }
});

async function handleVerification(
  // deno-lint-ignore no-explicit-any
  supabaseClient: any,
  phone: string,
  code: string,
  accountSid: string,
  authToken: string,
  fromNumber: string,
  toNumber: string
) {
  const { data: connection, error } = await supabaseClient
    .from("messaging_connections")
    .select("*")
    .eq("platform", "sms")
    .eq("verification_code", code)
    .eq("is_verified", false)
    .single();

  if (connection && !error) {
    await supabaseClient
      .from("messaging_connections")
      .update({
        phone_number: phone,
        platform_user_id: phone,
        is_verified: true,
        verification_code: null,
        verification_expires_at: null,
      })
      .eq("id", connection.id);

    await sendSMS(accountSid, authToken, fromNumber, toNumber, "Connected to Axiom! Send any task and I'll help. Try: Book a flight from Boston to SF");
  } else {
    await sendSMS(accountSid, authToken, fromNumber, toNumber, "Invalid code. Please get a new one from the Axiom app.");
  }
}

async function sendSMS(
  accountSid: string,
  authToken: string,
  from: string,
  to: string,
  body: string
) {
  const auth = btoa(`${accountSid}:${authToken}`);
  
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      From: from,
      To: to,
      Body: body,
    }),
  });
}
