// Memory / Preferences Tool — persists to Supabase

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export async function executeMemoryTool(
  toolName: string,
  args: Record<string, any>,
  userId?: string,
): Promise<string> {
  if (!userId) {
    return JSON.stringify({ error: "User not authenticated. Cannot access preferences." });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  if (toolName === "save_preference") {
    const { key, value } = args;

    // Upsert preference
    const { data: existing } = await supabase
      .from("user_preferences")
      .select("id")
      .eq("user_id", userId)
      .eq("preference_key", key)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("user_preferences")
        .update({ preference_value: value, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabase.from("user_preferences").insert({
        user_id: userId,
        preference_key: key,
        preference_value: value,
      });
    }

    return JSON.stringify({
      status: "saved",
      key,
      value,
      message: `Preference "${key}" saved. I'll remember this for future requests.`,
    });
  }

  if (toolName === "get_preferences") {
    let query = supabase
      .from("user_preferences")
      .select("preference_key, preference_value")
      .eq("user_id", userId);

    if (args.keys && args.keys.length > 0) {
      query = query.in("preference_key", args.keys);
    }

    const { data, error } = await query;

    if (error) {
      return JSON.stringify({ error: `Failed to retrieve preferences: ${error.message}` });
    }

    const prefs: Record<string, any> = {};
    for (const row of data ?? []) {
      prefs[row.preference_key] = row.preference_value;
    }

    return JSON.stringify({
      preferences: prefs,
      count: Object.keys(prefs).length,
    });
  }

  return JSON.stringify({ error: "Unknown memory action" });
}
