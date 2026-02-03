import { useState, useEffect } from "react";
import { MessageCircle, Phone, Send, CheckCircle, XCircle, Loader2, QrCode, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

type Platform = "telegram" | "whatsapp" | "sms";

interface Connection {
  id: string;
  platform: Platform;
  display_name: string | null;
  phone_number: string | null;
  is_verified: boolean;
  created_at: string;
}

const TELEGRAM_BOT_USERNAME = "AxiomAssistantBot"; // You'll need to create this bot

export function MessagingConnections() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [telegramLink, setTelegramLink] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchConnections();
    }
  }, [user]);

  const fetchConnections = async () => {
    try {
      const { data, error } = await supabase
        .from("messaging_connections")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setConnections((data || []) as Connection[]);
    } catch (error) {
      console.error("Failed to fetch connections:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateVerificationCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const connectTelegram = async () => {
    setConnectingPlatform("telegram");
    const code = generateVerificationCode();
    setVerificationCode(code);

    try {
      // Create pending connection
      const { error } = await supabase.from("messaging_connections").insert({
        user_id: user?.id,
        platform: "telegram",
        platform_user_id: `pending_${code}`,
        verification_code: code,
        verification_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min
      });

      if (error) throw error;

      const link = `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${code}`;
      setTelegramLink(link);
      setDialogOpen(true);
    } catch (error) {
      console.error("Failed to create Telegram connection:", error);
      toast({
        title: "Error",
        description: "Failed to generate connection link. Please try again.",
        variant: "destructive",
      });
      setConnectingPlatform(null);
    }
  };

  const connectWhatsApp = async () => {
    if (!phoneNumber.trim()) {
      toast({
        title: "Phone Required",
        description: "Please enter your WhatsApp phone number.",
        variant: "destructive",
      });
      return;
    }

    setConnectingPlatform("whatsapp");
    const code = generateVerificationCode();
    setVerificationCode(code);

    try {
      const { error } = await supabase.from("messaging_connections").insert({
        user_id: user?.id,
        platform: "whatsapp",
        platform_user_id: `pending_${code}`,
        phone_number: phoneNumber.replace(/\D/g, ""),
        verification_code: code,
        verification_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      });

      if (error) throw error;

      setDialogOpen(true);
      toast({
        title: "Verification Code Generated",
        description: `Send "VERIFY:${code}" to our WhatsApp number to connect.`,
      });
    } catch (error) {
      console.error("Failed to create WhatsApp connection:", error);
      toast({
        title: "Error",
        description: "Failed to generate verification code. Please try again.",
        variant: "destructive",
      });
      setConnectingPlatform(null);
    }
  };

  const connectSMS = async () => {
    if (!phoneNumber.trim()) {
      toast({
        title: "Phone Required",
        description: "Please enter your phone number.",
        variant: "destructive",
      });
      return;
    }

    setConnectingPlatform("sms");
    const code = generateVerificationCode();
    setVerificationCode(code);

    try {
      const { error } = await supabase.from("messaging_connections").insert({
        user_id: user?.id,
        platform: "sms",
        platform_user_id: `pending_${code}`,
        phone_number: phoneNumber.replace(/\D/g, ""),
        verification_code: code,
        verification_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      });

      if (error) throw error;

      setDialogOpen(true);
      toast({
        title: "Verification Code Generated",
        description: `Text "VERIFY:${code}" to our SMS number to connect.`,
      });
    } catch (error) {
      console.error("Failed to create SMS connection:", error);
      toast({
        title: "Error",
        description: "Failed to generate verification code. Please try again.",
        variant: "destructive",
      });
      setConnectingPlatform(null);
    }
  };

  const disconnectPlatform = async (connectionId: string, platform: string) => {
    try {
      const { error } = await supabase
        .from("messaging_connections")
        .delete()
        .eq("id", connectionId);

      if (error) throw error;

      setConnections((prev) => prev.filter((c) => c.id !== connectionId));
      toast({
        title: "Disconnected",
        description: `${platform} has been disconnected.`,
      });
    } catch (error) {
      console.error("Failed to disconnect:", error);
      toast({
        title: "Error",
        description: "Failed to disconnect. Please try again.",
        variant: "destructive",
      });
    }
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setConnectingPlatform(null);
    setVerificationCode("");
    setPhoneNumber("");
    setTelegramLink("");
    fetchConnections();
  };

  const getConnection = (platform: string) =>
    connections.find((c) => c.platform === platform && c.is_verified);

  const getPendingConnection = (platform: string) =>
    connections.find((c) => c.platform === platform && !c.is_verified);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const platforms = [
    {
      id: "telegram",
      name: "Telegram",
      icon: Send,
      color: "bg-[#0088cc]",
      description: "Connect via Telegram bot",
    },
    {
      id: "whatsapp",
      name: "WhatsApp",
      icon: MessageCircle,
      color: "bg-[#25D366]",
      description: "Connect your WhatsApp number",
    },
    {
      id: "sms",
      name: "SMS",
      icon: Phone,
      color: "bg-blue-500",
      description: "Connect your phone for SMS",
    },
  ];

  return (
    <>
      <div className="space-y-3">
        {platforms.map((platform) => {
          const connection = getConnection(platform.id);
          const pending = getPendingConnection(platform.id);
          const Icon = platform.icon;

          return (
            <div
              key={platform.id}
              className="glass rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${platform.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{platform.name}</h3>
                  {connection ? (
                    <p className="text-xs text-green-500 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Connected as {connection.display_name || connection.phone_number}
                    </p>
                  ) : pending ? (
                    <p className="text-xs text-yellow-500 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Pending verification
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">{platform.description}</p>
                  )}
                </div>
              </div>

              {connection ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => disconnectPlatform(connection.id, platform.name)}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Disconnect
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (platform.id === "telegram") connectTelegram();
                    else {
                      setConnectingPlatform(platform.id);
                      setDialogOpen(true);
                    }
                  }}
                >
                  Connect
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Connection Dialog */}
      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Connect{" "}
              {connectingPlatform === "telegram"
                ? "Telegram"
                : connectingPlatform === "whatsapp"
                ? "WhatsApp"
                : "SMS"}
            </DialogTitle>
            <DialogDescription>
              {connectingPlatform === "telegram"
                ? "Scan the QR code or click the link to connect"
                : "Enter your phone number to receive a verification code"}
            </DialogDescription>
          </DialogHeader>

          {connectingPlatform === "telegram" && telegramLink ? (
            <div className="space-y-4">
              <Tabs defaultValue="link" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="link" className="gap-2">
                    <Link2 className="w-4 h-4" />
                    Link
                  </TabsTrigger>
                  <TabsTrigger value="qr" className="gap-2">
                    <QrCode className="w-4 h-4" />
                    QR Code
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="link" className="space-y-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">
                      Click the link below to open Telegram:
                    </p>
                    <a
                      href={telegramLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline break-all text-sm"
                    >
                      {telegramLink}
                    </a>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <p className="text-sm font-medium text-primary">
                      Verification Code: {verificationCode}
                    </p>
                  </div>
                </TabsContent>
                <TabsContent value="qr" className="flex justify-center py-4">
                  <div className="w-48 h-48 bg-white rounded-lg flex items-center justify-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(telegramLink)}`}
                      alt="Telegram QR Code"
                      className="w-44 h-44"
                    />
                  </div>
                </TabsContent>
              </Tabs>
              <p className="text-xs text-muted-foreground text-center">
                After connecting, you can message Axiom directly from Telegram!
              </p>
            </div>
          ) : (connectingPlatform === "whatsapp" || connectingPlatform === "sms") && !verificationCode ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Phone Number</label>
                <Input
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button
                className="w-full"
                onClick={connectingPlatform === "whatsapp" ? connectWhatsApp : connectSMS}
              >
                Get Verification Code
              </Button>
            </div>
          ) : verificationCode ? (
            <div className="space-y-4">
              <div className="p-4 bg-primary/10 rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-2">Send this message to connect:</p>
                <p className="text-lg font-mono font-bold text-primary">VERIFY:{verificationCode}</p>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {connectingPlatform === "whatsapp"
                  ? "Send this code to our WhatsApp business number"
                  : "Text this code to our SMS number"}
              </p>
              <p className="text-xs text-muted-foreground text-center">
                Code expires in 15 minutes
              </p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
