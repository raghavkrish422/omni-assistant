import { motion } from "framer-motion";
import { ShoppingCart, Package, Truck, Clock, Check, X, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface CartItem {
  name: string;
  quantity: number;
  price: string;
}

export interface CartSummaryData {
  items: CartItem[];
  subtotal: string;
  delivery_fee?: string;
  service_fee?: string;
  tax?: string;
  estimated_total: string;
  store: string;
  delivery_time?: string;
}

interface CartSummaryProps {
  cart: CartSummaryData;
  onConfirm: () => void;
  onModify: () => void;
  isWaiting?: boolean;
}

export function CartSummary({ cart, onConfirm, onModify, isWaiting = false }: CartSummaryProps) {
  const getStoreColor = (store: string) => {
    const lowerStore = store.toLowerCase();
    if (lowerStore.includes("walmart")) return "from-blue-500 to-blue-600";
    if (lowerStore.includes("amazon")) return "from-orange-500 to-orange-600";
    if (lowerStore.includes("target")) return "from-red-500 to-red-600";
    if (lowerStore.includes("instacart")) return "from-green-500 to-green-600";
    if (lowerStore.includes("doordash")) return "from-red-500 to-pink-600";
    if (lowerStore.includes("ubereats")) return "from-green-600 to-lime-500";
    return "from-primary to-primary/80";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="rounded-xl border border-border/50 overflow-hidden bg-card/50 backdrop-blur-sm"
    >
      {/* Header */}
      <div className={`bg-gradient-to-r ${getStoreColor(cart.store)} px-4 py-3`}>
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-white" />
          <span className="font-semibold text-white">{cart.store} Cart</span>
          {cart.delivery_time && (
            <span className="ml-auto flex items-center gap-1 text-white/90 text-sm">
              <Clock className="w-4 h-4" />
              {cart.delivery_time}
            </span>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="p-4 space-y-3">
        <div className="space-y-2">
          {cart.items.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <Package className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                </div>
              </div>
              <span className="text-sm font-medium text-foreground">{item.price}</span>
            </motion.div>
          ))}
        </div>

        {/* Fees */}
        <div className="pt-3 border-t border-border/50 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="text-foreground">{cart.subtotal}</span>
          </div>
          {cart.delivery_fee && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Truck className="w-3 h-3" /> Delivery
              </span>
              <span className="text-foreground">{cart.delivery_fee}</span>
            </div>
          )}
          {cart.service_fee && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Service Fee</span>
              <span className="text-foreground">{cart.service_fee}</span>
            </div>
          )}
          {cart.tax && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
              <span className="text-foreground">{cart.tax}</span>
            </div>
          )}
        </div>

        {/* Total */}
        <div className="pt-3 border-t border-border/50">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-foreground">Estimated Total</span>
            <span className="text-lg font-bold text-primary">{cart.estimated_total}</span>
          </div>
        </div>

        {/* Actions */}
        {isWaiting && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="pt-4 flex gap-3"
          >
            <Button
              variant="outline"
              onClick={onModify}
              className="flex-1 h-11 rounded-xl"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Modify
            </Button>
            <Button
              onClick={onConfirm}
              className="flex-1 h-11 rounded-xl bg-gradient-primary hover:opacity-90"
            >
              <Check className="w-4 h-4 mr-2" />
              Confirm & Checkout
            </Button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// Helper to parse cart_summary from message content
export function parseCartSummary(content: string): CartSummaryData | null {
  const cartMatch = content.match(/```cart_summary\s*([\s\S]*?)```/);
  if (!cartMatch) return null;

  try {
    const jsonStr = cartMatch[1].trim();
    return JSON.parse(jsonStr) as CartSummaryData;
  } catch (e) {
    console.error("Failed to parse cart summary:", e);
    return null;
  }
}
