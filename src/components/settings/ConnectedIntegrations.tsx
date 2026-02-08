import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plug, RefreshCw, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface PicaConnection {
  platform: string;
  connection_key: string;
  status: string;
  display_name: string;
  created_at: string;
}

export function ConnectedIntegrations() {
  const [connections, setConnections] = useState<PicaConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();

  const fetchConnections = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [
              { role: "user", content: "List my connected integrations. Only use the pica_list_connections tool and return just the raw JSON data, no formatting." },
            ],
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch connections");
      }

      // Parse the SSE stream to get the response
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]" || jsonStr === "") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) fullText += content;
          } catch {
            // skip malformed
          }
        }
      }

      // Try to extract connection data from the response
      const jsonMatch = fullText.match(/\{[\s\S]*"connected_platforms"[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const data = JSON.parse(jsonMatch[0]);
          setConnections(data.connected_platforms || []);
        } catch {
          // If AI returned formatted text, try to parse it differently
          setConnections([]);
        }
      } else {
        setConnections([]);
      }
    } catch (err) {
      console.error("Failed to fetch integrations:", err);
      setError("Could not load integrations. Make sure your Pica API key is configured.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchConnections();
    }
  }, [session]);

  const platformIcons: Record<string, string> = {
    gmail: "📧",
    "google-calendar": "📅",
    calendly: "🗓️",
    slack: "💬",
    canva: "🎨",
    notion: "📝",
    github: "🐙",
    trello: "📋",
    asana: "✅",
    hubspot: "🔷",
    stripe: "💳",
    shopify: "🛍️",
    zoom: "📹",
    discord: "🎮",
    twitter: "🐦",
    linkedin: "💼",
    salesforce: "☁️",
    jira: "🎯",
  };

  const getIcon = (platform: string) => {
    const key = platform.toLowerCase();
    for (const [k, v] of Object.entries(platformIcons)) {
      if (key.includes(k)) return v;
    }
    return "🔗";
  };

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">Connected Integrations</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Platforms connected via Pica for real API access
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={fetchConnections}
          disabled={loading}
          className="rounded-xl hover:bg-muted"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-sm mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && connections.length === 0 && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && connections.length === 0 && !error && (
        <div className="text-center py-8">
          <Plug className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-3">
            No integrations connected yet
          </p>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => window.open("https://pica.dev", "_blank")}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Connect on Pica
          </Button>
        </div>
      )}

      {connections.length > 0 && (
        <div className="space-y-2">
          {connections.map((conn, index) => (
            <motion.div
              key={conn.connection_key || index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <span className="text-xl">{getIcon(conn.platform)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground capitalize">
                  {conn.display_name || conn.platform}
                </p>
                <p className="text-xs text-muted-foreground truncate font-mono">
                  {conn.connection_key}
                </p>
              </div>
              <Badge
                variant={conn.status === "operational" ? "default" : "secondary"}
                className="text-xs shrink-0"
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                {conn.status || "Active"}
              </Badge>
            </motion.div>
          ))}
        </div>
      )}

      {connections.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-4 gap-2"
          onClick={() => window.open("https://pica.dev", "_blank")}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Manage on Pica
        </Button>
      )}
    </div>
  );
}
