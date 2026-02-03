import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, 
  Mic, 
  Camera, 
  MapPin, 
  Monitor, 
  Bell,
  Check,
  X,
  Loader2,
  ChevronRight,
  Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { usePermissions, PermissionInfo } from "@/hooks/usePermissions";
import { useState } from "react";

interface PermissionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
}

const iconMap: Record<string, React.ElementType> = {
  mic: Mic,
  camera: Camera,
  "map-pin": MapPin,
  monitor: Monitor,
  bell: Bell,
};

const statusColors = {
  granted: "text-green-500",
  denied: "text-red-500",
  prompt: "text-muted-foreground",
  unavailable: "text-muted-foreground/50",
};

const statusBgColors = {
  granted: "bg-green-500/10",
  denied: "bg-red-500/10",
  prompt: "bg-muted",
  unavailable: "bg-muted/50",
};

export function PermissionsDialog({ isOpen, onClose, userName }: PermissionsDialogProps) {
  const {
    permissions,
    requestCamera,
    requestMicrophone,
    requestLocation,
    requestScreen,
    requestNotifications,
    getPermissionsList,
  } = usePermissions();

  const [loadingPermission, setLoadingPermission] = useState<string | null>(null);
  const permissionsList = getPermissionsList();

  const handleRequestPermission = async (permission: PermissionInfo) => {
    if (permission.status === "granted" || permission.status === "unavailable") return;
    
    setLoadingPermission(permission.name);
    
    switch (permission.name) {
      case "camera":
        await requestCamera();
        break;
      case "microphone":
        await requestMicrophone();
        break;
      case "location":
        await requestLocation();
        break;
      case "screen":
        await requestScreen();
        break;
      case "notifications":
        await requestNotifications();
        break;
    }
    
    setLoadingPermission(null);
  };

  const grantedCount = permissionsList.filter(p => p.status === "granted").length;
  const totalCount = permissionsList.filter(p => p.status !== "unavailable").length;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-md glass rounded-3xl overflow-hidden shadow-2xl border border-border"
          >
            {/* Header */}
            <div className="p-6 pb-4 border-b border-border/50">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="rounded-full -mr-2 -mt-2"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <h2 className="text-xl font-semibold text-foreground mb-1">
                Permissions & Privacy
              </h2>
              <p className="text-sm text-muted-foreground">
                {userName ? `Hi ${userName}! ` : ""}
                Grant access to enable full assistant capabilities. Your data stays secure.
              </p>
              
              {/* Security badge */}
              <div className="flex items-center gap-2 mt-4 p-2 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
                <Lock className="w-4 h-4" />
                <span className="text-xs font-medium">Connection secure • End-to-end encrypted</span>
              </div>
            </div>

            {/* Permission items */}
            <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
              {permissionsList.map((permission) => {
                const Icon = iconMap[permission.icon] || Shield;
                const isLoading = loadingPermission === permission.name;
                const isGranted = permission.status === "granted";
                const isDenied = permission.status === "denied";
                const isUnavailable = permission.status === "unavailable";

                return (
                  <motion.button
                    key={permission.name}
                    onClick={() => handleRequestPermission(permission)}
                    disabled={isGranted || isUnavailable || isLoading}
                    className={`
                      w-full flex items-center gap-4 p-4 rounded-2xl transition-all
                      ${statusBgColors[permission.status]}
                      ${!isGranted && !isUnavailable ? "hover:bg-muted cursor-pointer" : "cursor-default"}
                      disabled:opacity-70
                    `}
                    whileTap={{ scale: isGranted || isUnavailable ? 1 : 0.98 }}
                  >
                    <div className={`
                      w-10 h-10 rounded-xl flex items-center justify-center
                      ${isGranted ? "bg-green-500/20" : isDenied ? "bg-red-500/20" : "bg-muted"}
                    `}>
                      <Icon className={`w-5 h-5 ${statusColors[permission.status]}`} />
                    </div>
                    
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{permission.label}</span>
                        {isGranted && (
                          <span className="text-xs text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        )}
                        {isDenied && (
                          <span className="text-xs text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">
                            Denied
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {permission.description}
                      </p>
                    </div>

                    <div className="flex items-center">
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      ) : isGranted ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : isUnavailable ? (
                        <span className="text-xs text-muted-foreground">N/A</span>
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-4 pt-2 border-t border-border/50">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">
                  {grantedCount} of {totalCount} permissions granted
                </span>
                <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(grantedCount / totalCount) * 100}%` }}
                    className="h-full bg-primary rounded-full"
                  />
                </div>
              </div>
              
              <Button
                onClick={onClose}
                className="w-full rounded-xl h-12"
                size="lg"
              >
                {grantedCount === totalCount ? "All Set!" : "Continue"}
              </Button>
              
              <p className="text-xs text-center text-muted-foreground mt-3">
                You can change these anytime in Settings
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
