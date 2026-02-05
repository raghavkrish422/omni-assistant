// Payment Tool — Demo/sandbox mode

export function executePaymentTool(toolName: string, args: Record<string, any>): string {
  if (toolName !== "process_payment") {
    return JSON.stringify({ error: "Unknown payment action" });
  }

  const txnId = `TXN-${Date.now().toString(36).toUpperCase()}`;
  const amount = args.amount || 0;
  const method = args.method || "demo_card";

  const methodLabels: Record<string, string> = {
    demo_card: "Visa ending in 4242",
    demo_paypal: "PayPal (demo@example.com)",
    demo_applepay: "Apple Pay",
  };

  return JSON.stringify({
    demo_mode: true,
    payment: {
      transaction_id: txnId,
      status: "completed",
      amount: `$${amount.toFixed(2)}`,
      currency: args.currency || "USD",
      method: methodLabels[method] || method,
      description: args.description,
      processed_at: new Date().toISOString(),
      message: `Payment of $${amount.toFixed(2)} processed successfully via ${methodLabels[method] || method}. Transaction ID: ${txnId}`,
    },
  });
}
