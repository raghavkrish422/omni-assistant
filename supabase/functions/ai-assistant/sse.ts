// supabase/functions/ai-assistant/sse.ts

function escapeForJsonString(s: string) {
  // JSON.stringify handles escaping; we just keep this helper for clarity.
  return JSON.stringify(s);
}

export function createSSEStreamFromText(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      const created = Math.floor(Date.now() / 1000);
      const payload = {
        id: `local-${created}`,
        object: "chat.completion.chunk",
        created,
        model: "local/weather",
        choices: [
          {
            index: 0,
            delta: { content: text },
          },
        ],
      };

      const dataLine = `data: ${JSON.stringify(payload)}\n\n`;
      controller.enqueue(encoder.encode(dataLine));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}
