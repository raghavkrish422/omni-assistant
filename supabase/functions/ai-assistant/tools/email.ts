// Email & Messaging Tool — Demo mode

export function executeEmailTool(toolName: string, args: Record<string, any>): string {
  if (toolName === "send_email") {
    const msgId = `EMAIL-${Date.now().toString(36).toUpperCase()}`;
    return JSON.stringify({
      demo_mode: true,
      email: {
        message_id: msgId,
        status: "sent",
        to: args.to,
        subject: args.subject,
        cc: args.cc || [],
        sent_at: new Date().toISOString(),
        message: `Email sent to ${args.to} with subject "${args.subject}".`,
      },
    });
  }

  if (toolName === "send_message") {
    const msgId = `MSG-${Date.now().toString(36).toUpperCase()}`;
    return JSON.stringify({
      demo_mode: true,
      message: {
        message_id: msgId,
        status: "delivered",
        platform: args.platform,
        to: args.to,
        content: args.message,
        sent_at: new Date().toISOString(),
        message: `Message sent via ${args.platform} to ${args.to}.`,
      },
    });
  }

  return JSON.stringify({ error: "Unknown messaging action" });
}
