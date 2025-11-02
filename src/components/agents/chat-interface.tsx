"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, Loader2 } from "lucide-react";
import type { Message } from "@/agents/core/types";

interface ChatInterfaceProps {
  sessionId: string;
  messages: Message[];
  onSendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
  isComplete: boolean;
}

// Strip markdown formatting from text
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')  // Remove ***bold+italic***
    .replace(/\*\*(.+?)\*\*/g, '$1')      // Remove **bold**
    .replace(/\*(.+?)\*/g, '$1')          // Remove *italic*
    .replace(/__(.+?)__/g, '$1')          // Remove __underline__
    .replace(/_(.+?)_/g, '$1')            // Remove _italic_
    .replace(/~~(.+?)~~/g, '$1')          // Remove ~~strikethrough~~
    .replace(/`(.+?)`/g, '$1')            // Remove `code`
    .replace(/\[(.*?)\]\(.*?\)/g, '$1');  // Remove [links](url)
}

export function ChatInterface({
  sessionId,
  messages,
  onSendMessage,
  isLoading,
  isComplete,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("=== CHAT INTERFACE: handleSubmit ===");
    console.log("Input:", input);
    console.log("IsLoading:", isLoading);
    console.log("IsComplete:", isComplete);
    
    if (!input.trim() || isLoading || isComplete) {
      console.log("Submit blocked - conditions not met");
      return;
    }

    const message = input.trim();
    console.log("Sending message:", message);
    setInput("");
    await onSendMessage(message);
    console.log("Message sent successfully");
  };

  return (
    <div className="relative group h-full">
      {/* Subtle glow effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600/20 via-violet-600/20 to-fuchsia-600/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
      
      <Card className="relative flex flex-col h-full shadow-xl border border-border/50 bg-card/80 backdrop-blur-xl overflow-hidden rounded-3xl">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-4" style={{ maxHeight: 'calc(100vh - 250px)' }}>
          {messages.length === 0 && !isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-purple-500/10 to-violet-500/10 border border-primary/20 flex items-center justify-center">
                  <span className="text-3xl">💬</span>
                </div>
                <p className="text-sm text-muted-foreground">Waiting for conversation to start...</p>
              </div>
            </div>
          )}
          
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={`flex animate-slide-in-bottom ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
              style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
            >
              <div
                className={`max-w-[90%] p-4 rounded-2xl shadow-lg break-words ${
                  message.role === "user"
                    ? "bg-gradient-to-br from-purple-500 via-violet-500 to-fuchsia-500 text-white rounded-br-sm border border-purple-400/20"
                    : "bg-card/90 backdrop-blur-sm rounded-bl-sm border border-border/50"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/50">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500/20 to-violet-500/20 border border-primary/30 flex items-center justify-center text-xs font-bold shrink-0">
                      <span className="bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">AI</span>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">Assistant</span>
                  </div>
                )}
                <div className="text-sm leading-relaxed whitespace-pre-wrap break-words overflow-wrap-anywhere">
                  {stripMarkdown(message.content)}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2">
              <div className="bg-card/90 backdrop-blur-sm p-4 rounded-2xl rounded-bl-sm shadow-lg border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-violet-500 rounded-full blur opacity-50" />
                    <Loader2 className="relative h-4 w-4 animate-spin text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    AI is thinking...
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border/50 bg-card/50 backdrop-blur-sm p-4">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isComplete
                  ? "✅ Conversation complete"
                  : "Type your answer and press Enter..."
              }
              disabled={isLoading || isComplete}
              className="flex-1 h-12 text-base rounded-xl border-border/50 bg-background/50 backdrop-blur-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
            <div className="relative group/button">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 via-violet-600 to-fuchsia-600 rounded-xl blur opacity-0 group-hover/button:opacity-75 transition duration-300" />
              <Button
                type="submit"
                disabled={!input.trim() || isLoading || isComplete}
                size="icon"
                className="relative h-12 w-12 shadow-lg bg-gradient-to-r from-purple-500 via-violet-500 to-fuchsia-500 hover:from-purple-600 hover:via-violet-600 hover:to-fuchsia-600 border-0 rounded-xl"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </form>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Press <kbd className="px-2 py-1 rounded-lg bg-muted/50 border border-border/50 text-[10px] font-mono shadow-sm">Enter</kbd> to send
          </p>
        </div>
      </Card>
    </div>
  );
}
