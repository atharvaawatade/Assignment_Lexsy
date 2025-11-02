"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChatInterface } from "@/components/agents/chat-interface";
import { DocumentPreview } from "@/components/document/preview";
import { LiveDocumentPreview } from "@/components/document/live-preview";
import { EnhancedDocumentPreview } from "@/components/document/enhanced-preview";
import { Button } from "@/components/ui/button";
import { useSessionStore } from "@/store/session.store";
import { Download, Loader2, FileText, List, Eye } from "lucide-react";
import type { Message, Field } from "@/agents/core/types";

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const {
    fields,
    filledFields,
    conversationHistory,
    status,
    setFields,
    setStatus,
    addMessage,
    setFilledField,
  } = useSessionStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [previewTab, setPreviewTab] = useState<"fields" | "document" | "enhanced">("enhanced");
  const [documentText, setDocumentText] = useState<string>("");
  const [documentBuffer, setDocumentBuffer] = useState<ArrayBuffer | null>(null);
  const hasInitialized = useRef(false);

  // Handle manual field update
  const handleFieldUpdate = async (fieldId: string, value: string) => {
    try {
      console.log("📝 Manual edit - Updating field:", fieldId, "→", value);
      
      // Update store immediately for instant UI feedback
      setFilledField(fieldId, value);

      // Update session on server
      const response = await fetch("/api/agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          message: value,
          fieldId,
        }),
      });

      if (response.ok) {
        console.log("✅ Field updated successfully on server");
      }
    } catch (error) {
      console.error("❌ Failed to update field:", error);
    }
  };

  // Parse document on mount
  useEffect(() => {
    // Prevent duplicate initialization
    if (hasInitialized.current) {
      console.log("Already initialized, skipping");
      return;
    }

    const parseDocument = async () => {
      console.log("=== FRONTEND: Starting parse ===");
      console.log("SessionId:", sessionId);
      
      try {
        const response = await fetch("/api/agents/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });

        console.log("Parse response status:", response.status);

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Parse error response:", errorData);
          throw new Error("Failed to parse document");
        }

        const data = await response.json();
        console.log("Parse success! Fields count:", data.fields?.length);
        
        setFields(data.fields);
        setDocumentText(data.text || ""); // Store document text for preview
        setStatus("chatting");

        // Start conversation - pass fields directly to avoid race condition
        await sendMessage("", true, data.fields);
        
        // Mark as initialized
        hasInitialized.current = true;
      } catch (error) {
        console.error("Parse error:", error);
      } finally {
        setIsParsing(false);
      }
    };

    parseDocument();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const sendMessage = async (content: string, isFirst = false, parsedFields?: Field[]) => {
    console.log("=== FRONTEND: sendMessage ===");
    console.log("Content:", content);
    console.log("IsFirst:", isFirst);
    
    // Use passed fields or state fields
    const currentFields = parsedFields || fields;
    console.log("Using fields count:", currentFields.length);
    
    setIsLoading(true);

    try {
      const response = await fetch("/api/agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          message: content,
          isFirstMessage: isFirst,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const text = await response.text();
      console.log("Response from API:", text);

      // Add user message if not first
      if (!isFirst) {
        const userMessage: Message = {
          id: `msg-${Date.now()}-user`,
          role: "user",
          content,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);
        addMessage(userMessage);
      }

      // Add assistant message (avoid duplicates on first message)
      const assistantMessage: Message = {
        id: `msg-${Date.now()}-assistant`,
        role: "assistant",
        content: text,
        timestamp: new Date(),
      };
      
      // Check if this exact message already exists (prevent duplicates)
      setMessages((prev) => {
        const isDuplicate = prev.some(
          msg => msg.role === "assistant" && msg.content === text && 
          Math.abs(new Date(msg.timestamp).getTime() - Date.now()) < 1000
        );
        if (isDuplicate) {
          console.log("Duplicate message detected, skipping");
          return prev;
        }
        return [...prev, assistantMessage];
      });
      addMessage(assistantMessage);

      // Check if complete based on backend response message
      if (!isFirst) {
        // Check for TRUE completion (after review phase)
        const trueCompletionPhrases = [
          "document is ready",
          "thank you for using",
          "click the download"
        ];
        
        // Check for review phase
        const reviewPhrases = [
          "great! i've collected all",
          "what would you like to do",
          "type 'confirm'",
          "type 'change"
        ];
        
        // Check for validation failure (retry)
        const validationErrorPhrases = [
          "please provide",
          "try again",
          "doesn't look",
          "that doesn't",
          "please use",
          "try formats"
        ];
        
        const isTrueComplete = trueCompletionPhrases.some(phrase => 
          text.toLowerCase().includes(phrase.toLowerCase())
        );
        
        const isReviewPhase = reviewPhrases.some(phrase =>
          text.toLowerCase().includes(phrase.toLowerCase())
        );
        
        const isValidationError = validationErrorPhrases.some(phrase =>
          text.toLowerCase().includes(phrase.toLowerCase())
        );
        
        if (isTrueComplete) {
          console.log("Document truly complete! Enabling download.");
          setIsComplete(true);
          setStatus("complete");
          
          // Fetch updated session to sync filled fields
          await refreshSession();
        } else if (isReviewPhase) {
          // Entered review phase - all fields filled but not finalized
          console.log("Entered review phase");
          await refreshSession();
        } else if (isValidationError) {
          // Validation failed - don't fill the field, just wait for retry
          console.log("Validation failed, waiting for user to retry");
        } else {
          // Validation passed - update filled field from user input
          const currentFieldIndex = Object.keys(filledFields).length;
          if (currentFieldIndex < currentFields.length) {
            const currentField = currentFields[currentFieldIndex];
            console.log("Marking field as filled:", currentField.placeholder);
            setFilledField(currentField.id, content);
          }
        }
      }
    } catch (error) {
      console.error("Send message error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSession = async () => {
    // No need to fetch from backend - we're already tracking state locally
    console.log("Session refresh requested (no-op in current implementation)");
  };

  const handleDownload = async () => {
    try {
      setStatus("generating");
      
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate document");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "completed-document.docx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download error:", error);
    }
  };

  if (isParsing) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-950/20 via-background to-violet-950/20 animate-gradient" />
        
        {/* Floating orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        
        <div className="relative z-10 text-center space-y-6 p-8">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-violet-500 rounded-full blur-2xl opacity-50 animate-pulse" />
            <Loader2 className="relative h-20 w-20 animate-spin mx-auto text-primary" />
          </div>
          <div className="space-y-3">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Analyzing Your Document
            </h2>
            <p className="text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
              Our AI is reading your document and identifying the fields that need to be filled...
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 mt-6">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-violet-500 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-500 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-950/10 via-background to-violet-950/10 animate-gradient" />
      
      {/* Subtle floating orbs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      
      {/* Header */}
      <div className="relative z-10 border-b border-border/50 bg-card/80 backdrop-blur-xl supports-[backdrop-filter]:bg-card/60 p-5 flex items-center justify-between shadow-lg">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            LawTech
          </h1>
          <p className="text-sm text-muted-foreground">
            {isComplete ? (
              <span className="inline-flex items-center gap-2 text-primary font-medium animate-fade-in">
                <span className="text-lg">🎉</span>
                Document ready for download!
              </span>
            ) : (
              "AI-powered document completion"
            )}
          </p>
        </div>
        {isComplete && (
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-violet-600 to-fuchsia-600 rounded-xl blur opacity-50 group-hover:opacity-75 transition duration-300" />
            <Button 
              onClick={handleDownload} 
              size="lg" 
              className="relative shadow-lg hover:shadow-xl transition-all duration-300 animate-scale-in bg-gradient-to-r from-purple-500 via-violet-500 to-fuchsia-500 hover:from-purple-600 hover:via-violet-600 hover:to-fuchsia-600 border-0"
            >
              <Download className="h-5 w-5 mr-2" />
              Download Document
            </Button>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 overflow-hidden" style={{ height: 'calc(100vh - 100px)' }}>
        {/* Chat Section */}
        <div className="flex flex-col h-full overflow-hidden">
          <div className="mb-4 shrink-0 space-y-1">
            <h2 className="text-lg font-semibold bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">AI Assistant</h2>
            <p className="text-xs text-muted-foreground">Answer the questions to complete your document</p>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <ChatInterface
              sessionId={sessionId}
              messages={messages}
              onSendMessage={sendMessage}
              isLoading={isLoading}
              isComplete={isComplete}
            />
          </div>
        </div>

        {/* Preview Section */}
        <div className="flex flex-col h-full overflow-hidden">
          <div className="mb-3 space-y-3 shrink-0">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Preview</h2>
              <p className="text-xs text-muted-foreground">Track progress and see live document</p>
            </div>
            
            {/* Tab Buttons */}
            <div className="flex gap-2 border-b border-border/50">
              <button
                onClick={() => setPreviewTab("fields")}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all rounded-t-xl relative ${
                  previewTab === "fields"
                    ? "text-primary border-b-2 border-primary bg-gradient-to-br from-purple-500/10 to-violet-500/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <List className="h-4 w-4" />
                <span>Fields</span>
                <span className="ml-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500/20 to-violet-500/20 text-xs font-bold">
                  {Object.keys(filledFields).length}/{fields.length}
                </span>
              </button>
              <button
                onClick={() => setPreviewTab("enhanced")}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all rounded-t-xl relative ${
                  previewTab === "enhanced"
                    ? "text-primary border-b-2 border-primary bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Eye className="h-4 w-4" />
                <span>Preview</span>
                <span className="ml-1 px-1.5 py-0.5 rounded text-xs font-bold bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-600 dark:text-blue-400">
                  HD
                </span>
              </button>
              <button
                onClick={() => setPreviewTab("document")}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all rounded-t-xl relative ${
                  previewTab === "document"
                    ? "text-primary border-b-2 border-primary bg-gradient-to-br from-fuchsia-500/10 to-purple-500/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <FileText className="h-4 w-4" />
                <span>Text</span>
              </button>
            </div>
          </div>
          
          <div className="flex-1 min-h-0 overflow-hidden">
            {previewTab === "fields" ? (
              <DocumentPreview
                fields={fields}
                filledFields={filledFields}
                onFieldUpdate={handleFieldUpdate}
              />
            ) : previewTab === "enhanced" ? (
              <EnhancedDocumentPreview
                documentBuffer={documentBuffer || undefined}
                documentText={documentText}
                fields={fields}
                filledFields={filledFields}
              />
            ) : (
              <LiveDocumentPreview
                fields={fields}
                filledFields={filledFields}
                documentText={documentText}
                onFieldUpdate={handleFieldUpdate}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
