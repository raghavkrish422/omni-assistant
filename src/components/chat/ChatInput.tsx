import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Loader2 } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, isLoading, placeholder = "Ask me anything..." }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSend(input.trim());
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onSubmit={handleSubmit}
      className="relative"
    >
      <div className="glass rounded-2xl p-2 flex items-end gap-2 border border-border/50 focus-within:border-primary/50 transition-colors duration-300">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          rows={1}
          className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground resize-none focus:outline-none px-4 py-3 min-h-[48px] max-h-[120px]"
        />
        <motion.button
          type="submit"
          disabled={!input.trim() || isLoading}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-opacity duration-200 shadow-lg hover:shadow-xl"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-primary-foreground animate-spin" />
          ) : (
            <Send className="w-5 h-5 text-primary-foreground" />
          )}
        </motion.button>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-3">
        Your AI assistant for everyday tasks. Privacy-first, always in control.
      </p>
    </motion.form>
  );
}
