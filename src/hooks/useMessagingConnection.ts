import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Platform = "telegram" | "whatsapp" | "sms";

interface MessagingConnection {
  id: string;
  platform: Platform;
  platform_user_id: string;
  chat_id: string | null;
  phone_number: string | null;
  display_name: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export function useMessagingConnections() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<MessagingConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setConnections([]);
      setLoading(false);
      return;
    }

    const fetchConnections = async () => {
      try {
        const { data, error } = await supabase
          .from("messaging_connections")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_verified", true);

        if (error) throw error;
        setConnections((data || []) as MessagingConnection[]);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch connections"));
      } finally {
        setLoading(false);
      }
    };

    fetchConnections();

    // Subscribe to changes
    const channel = supabase
      .channel("messaging_connections_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messaging_connections",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const newConnection = payload.new as MessagingConnection;
            if (newConnection.is_verified) {
              setConnections((prev) => {
                const exists = prev.find((c) => c.id === newConnection.id);
                if (exists) {
                  return prev.map((c) => (c.id === newConnection.id ? newConnection : c));
                }
                return [...prev, newConnection];
              });
            }
          } else if (payload.eventType === "DELETE") {
            setConnections((prev) => prev.filter((c) => c.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const isConnected = (platform: "telegram" | "whatsapp" | "sms") =>
    connections.some((c) => c.platform === platform);

  const getConnection = (platform: "telegram" | "whatsapp" | "sms") =>
    connections.find((c) => c.platform === platform);

  return {
    connections,
    loading,
    error,
    isConnected,
    getConnection,
  };
}
