// Pica Integration Tool — Connects to 200+ platforms via Pica API

const PICA_API_BASE = "https://api.picaos.com/v1";

function getPicaSecret(): string {
  const key = Deno.env.get("PICA_SECRET_KEY");
  if (!key) throw new Error("PICA_SECRET_KEY is not configured");
  return key;
}

function picaHeaders(): Record<string, string> {
  return {
    "x-pica-secret": getPicaSecret(),
    "Content-Type": "application/json",
  };
}

/** List all connected integrations (Gmail, Calendly, Slack, etc.) */
async function listConnections(): Promise<string> {
  const res = await fetch(`${PICA_API_BASE}/connections`, {
    headers: picaHeaders(),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Pica list connections error:", res.status, err);
    return JSON.stringify({ error: `Failed to list connections: ${res.status}` });
  }

  const data = await res.json();
  const connections = (data.rows || data.data || data || []).map((c: any) => ({
    platform: c.platform || c.connector?.platform,
    connection_key: c.key || c.connectionKey || c._id,
    status: c.status || "operational",
    display_name: c.connector?.name || c.platform || "Unknown",
    created_at: c.createdAt || c.created_at,
  }));

  return JSON.stringify({
    connected_platforms: connections,
    total: connections.length,
    message: connections.length > 0
      ? `You have ${connections.length} connected platform(s): ${connections.map((c: any) => c.display_name).join(", ")}`
      : "No platforms connected. Please connect platforms through Pica dashboard at pica.dev",
  });
}

/** Search available actions for a platform */
async function searchPlatformActions(
  platform: string,
  query?: string,
): Promise<string> {
  const params = new URLSearchParams();
  if (query) params.set("title", query);
  params.set("limit", "20");

  const url = `${PICA_API_BASE}/available-actions/${encodeURIComponent(platform)}${params.toString() ? `?${params}` : ""}`;
  const res = await fetch(url, { headers: picaHeaders() });

  if (!res.ok) {
    const err = await res.text();
    console.error("Pica search actions error:", res.status, err);
    return JSON.stringify({ error: `Failed to search actions for ${platform}: ${res.status}` });
  }

  const data = await res.json();
  const actions = (data.rows || data.data || data || []).map((a: any) => ({
    action_id: a._id || a.id,
    title: a.title,
    description: a.description,
    method: a.method,
    path: a.path,
    tags: a.tags,
  }));

  return JSON.stringify({
    platform,
    actions,
    total: actions.length,
    message: actions.length > 0
      ? `Found ${actions.length} action(s) for ${platform}${query ? ` matching "${query}"` : ""}`
      : `No actions found for ${platform}${query ? ` matching "${query}"` : ""}`,
  });
}

/** Get detailed knowledge about a specific action (parameters, headers, etc.) */
async function getActionKnowledge(actionId: string): Promise<string> {
  const res = await fetch(
    `${PICA_API_BASE}/available-actions/action/${encodeURIComponent(actionId)}/knowledge`,
    { headers: picaHeaders() },
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("Pica action knowledge error:", res.status, err);
    return JSON.stringify({ error: `Failed to get action knowledge: ${res.status}` });
  }

  const data = await res.json();
  return JSON.stringify({
    action_id: actionId,
    knowledge: data.knowledge || data,
    method: data.method,
    path: data.path,
    message: "Action knowledge retrieved. Use execute_action to perform this action.",
  });
}

/** Execute an action via the Pica Passthrough API */
async function executeAction(args: {
  connection_key: string;
  method?: string;
  path: string;
  action_id?: string;
  platform: string;
  headers?: Record<string, string>;
  query_params?: Record<string, string>;
  body?: any;
}): Promise<string> {
  const {
    connection_key,
    method = "GET",
    path,
    action_id,
    platform,
    headers: extraHeaders,
    query_params,
    body,
  } = args;

  const params = query_params ? `?${new URLSearchParams(query_params)}` : "";
  const url = `${PICA_API_BASE}/passthrough${path}${params}`;

  const reqHeaders: Record<string, string> = {
    ...picaHeaders(),
    "x-pica-connection-key": connection_key,
  };
  if (action_id) reqHeaders["x-pica-action-id"] = action_id;
  if (extraHeaders) Object.assign(reqHeaders, extraHeaders);

  const fetchOptions: RequestInit = {
    method: method.toUpperCase(),
    headers: reqHeaders,
  };

  if (body && ["POST", "PUT", "PATCH"].includes(method.toUpperCase())) {
    fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
  }

  console.log(`Pica execute: ${method} ${path} on ${platform}`);
  const res = await fetch(url, fetchOptions);

  if (!res.ok) {
    const err = await res.text();
    console.error(`Pica execute error [${res.status}]:`, err);
    return JSON.stringify({
      error: `Action execution failed (${res.status})`,
      details: err,
      platform,
      path,
    });
  }

  const responseText = await res.text();
  let responseData: any;
  try {
    responseData = JSON.parse(responseText);
  } catch {
    responseData = responseText;
  }

  return JSON.stringify({
    success: true,
    platform,
    method,
    path,
    data: responseData,
  });
}

/** Main entry point for Pica tool execution */
export async function executePicaTool(
  toolName: string,
  args: Record<string, any>,
): Promise<string> {
  try {
    switch (toolName) {
      case "pica_list_connections":
        return await listConnections();

      case "pica_search_actions":
        return await searchPlatformActions(args.platform, args.query);

      case "pica_get_action_knowledge":
        return await getActionKnowledge(args.action_id);

      case "pica_execute_action":
        return await executeAction(args);

      default:
        return JSON.stringify({ error: `Unknown Pica tool: ${toolName}` });
    }
  } catch (err) {
    console.error(`Pica tool ${toolName} error:`, err);
    return JSON.stringify({
      error: `Pica tool failed: ${err instanceof Error ? err.message : "Unknown error"}`,
    });
  }
}
