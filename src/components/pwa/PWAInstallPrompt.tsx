// PWA Install prompt component
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isNative, platform } from "@/lib/capacitor";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Don't show on native apps
    if (isNative) return;

    // Check if iOS Safari
    const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && 
      !('MSStream' in window) &&
      'standalone' in navigator;
    
    setIsIOS(isIOSSafari);

    // Listen for the install prompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show prompt after a delay if not already installed
      setTimeout(() => {
        if (!window.matchMedia('(display-mode: standalone)').matches) {
          setShowPrompt(true);
        }
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // For iOS, show prompt after delay
    if (isIOSSafari && !('standalone' in navigator && (navigator as { standalone?: boolean }).standalone)) {
      setTimeout(() => setShowPrompt(true), 5000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Don't show again for this session
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  // Don't render if already dismissed this session
  if (sessionStorage.getItem('pwa-prompt-dismissed')) {
    return null;
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80"
        >
          <div className="glass rounded-2xl p-4 border border-white/10 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-gradient-primary">
                <Smartphone className="w-5 h-5 text-primary-foreground" />
              </div>
              
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Install Axiom</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {isIOS 
                    ? "Tap the share button, then 'Add to Home Screen'" 
                    : "Install for quick access and offline use"
                  }
                </p>
                
                {!isIOS && deferredPrompt && (
                  <Button
                    size="sm"
                    onClick={handleInstall}
                    className="mt-3 w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Install App
                  </Button>
                )}
              </div>
              
              <button
                onClick={handleDismiss}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
