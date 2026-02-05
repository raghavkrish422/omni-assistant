// Calculator Tool — safe math evaluation

interface CalcArgs {
  expression: string;
}

function evaluateExpression(expr: string): number | string {
  let cleaned = expr.trim();

  // Handle percentage: "15% of 200" → 0.15 * 200
  const pctOf = cleaned.match(/^([\d.]+)%\s*of\s*([\d.]+)$/i);
  if (pctOf) {
    return (parseFloat(pctOf[1]) / 100) * parseFloat(pctOf[2]);
  }

  // Handle "X% discount on Y"
  const discount = cleaned.match(/^([\d.]+)%\s*discount\s*on\s*([\d.]+)$/i);
  if (discount) {
    const pct = parseFloat(discount[1]) / 100;
    const base = parseFloat(discount[2]);
    return base - base * pct;
  }

  // Handle tip: "20% tip on $150"
  const tip = cleaned.match(/^([\d.]+)%\s*tip\s*on\s*\$?([\d.]+)$/i);
  if (tip) {
    return (parseFloat(tip[1]) / 100) * parseFloat(tip[2]);
  }

  // Strip dollar signs, commas
  cleaned = cleaned.replace(/[$,]/g, "");

  // Only allow safe characters: digits, operators, parentheses, decimal points, spaces
  if (!/^[\d+\-*/().%^ \t]+$/.test(cleaned)) {
    return `Cannot evaluate: "${expr}". Only basic arithmetic is supported.`;
  }

  // Handle ^ as exponent → **
  cleaned = cleaned.replace(/\^/g, "**");

  // Handle remaining % as modulo (JavaScript's %)
  try {
    // Use Function constructor for safe eval of math expressions
    const fn = new Function(`"use strict"; return (${cleaned})`);
    const result = fn();
    if (typeof result !== "number" || !isFinite(result)) {
      return `Result is not a valid number for: "${expr}"`;
    }
    return Math.round(result * 1e10) / 1e10; // Avoid floating point noise
  } catch {
    return `Cannot evaluate: "${expr}"`;
  }
}

export function executeCalculatorTool(args: CalcArgs): string {
  const result = evaluateExpression(args.expression);
  return JSON.stringify({
    expression: args.expression,
    result: result,
  });
}
