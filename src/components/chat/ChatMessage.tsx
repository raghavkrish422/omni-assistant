import { motion } from "framer-motion";
import { Bot, User, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: "thinking" | "complete" | "error" | "confirming";
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
  index: number;
}

export function ChatMessage({ message, index }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`flex gap-4 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center shadow-lg">
          <Bot className="w-5 h-5 text-primary-foreground" />
        </div>
      )}

      <div
        className={`max-w-[80%] ${
          isUser
            ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
            : "glass rounded-2xl rounded-bl-md"
        } px-5 py-3`}
      >
        {message.status === "thinking" ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Thinking...</span>
          </div>
        ) : (
          <div className={`prose prose-sm ${isUser ? "prose-invert" : "prose-invert"} max-w-none`}>
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
                code: ({ children }) => (
                  <code className="bg-muted/50 px-1.5 py-0.5 rounded text-sm">{children}</code>
                ),
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Status indicator for assistant messages */}
        {!isUser && message.status && message.status !== "thinking" && (
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/30">
            {message.status === "complete" && (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                <span className="text-xs text-muted-foreground">Task completed</span>
              </>
            )}
            {message.status === "error" && (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                <span className="text-xs text-destructive">Error occurred</span>
              </>
            )}
            {message.status === "confirming" && (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-xs text-yellow-400">Awaiting confirmation</span>
              </>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
          <User className="w-5 h-5 text-foreground" />
        </div>
      )}
    </motion.div>
  );
}
