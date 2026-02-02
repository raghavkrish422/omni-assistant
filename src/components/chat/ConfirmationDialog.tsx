import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  details?: string[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationDialog({
  isOpen,
  title,
  description,
  details,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="glass rounded-2xl p-6 border border-border/50 shadow-2xl">
              {/* Icon */}
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-yellow-500" />
                </div>
              </div>

              {/* Content */}
              <div className="text-center space-y-3 mb-6">
                <h3 className="text-xl font-semibold text-foreground">{title}</h3>
                <p className="text-muted-foreground">{description}</p>

                {details && details.length > 0 && (
                  <div className="bg-muted/30 rounded-lg p-4 text-left mt-4">
                    <ul className="space-y-2">
                      {details.map((detail, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-primary mt-0.5">•</span>
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onCancel}
                  className="flex-1 h-12 rounded-xl"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={onConfirm}
                  className="flex-1 h-12 rounded-xl bg-gradient-primary hover:opacity-90"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Confirm
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
