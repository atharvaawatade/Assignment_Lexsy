"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { useSessionStore } from "@/store/session.store";
import { Upload, FileText, Loader2, Sparkles, CheckCircle2 } from "lucide-react";

export function UploadZone() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setSession, setStatus } = useSessionStore();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setError(null);
      setUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Upload failed");
        }

        const data = await response.json();
        const arrayBuffer = await file.arrayBuffer();

        setSession(data.sessionId, data.fileName, arrayBuffer);
        setStatus("parsing");

        // Redirect to chat
        router.push(`/chat/${data.sessionId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [router, setSession, setStatus]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="relative group">
        {/* Glow effect */}
        <div className={`absolute -inset-1 bg-gradient-to-r from-purple-600 via-violet-600 to-fuchsia-600 rounded-3xl blur-xl opacity-0 group-hover:opacity-30 transition-all duration-500 ${isDragActive ? 'opacity-50' : ''}`} />
        
        <Card
          {...getRootProps()}
          className={`
            relative p-16 border-2 border-dashed cursor-pointer transition-all duration-300 rounded-3xl
            backdrop-blur-xl bg-card/80
            ${isDragActive 
              ? "border-primary bg-gradient-to-br from-purple-500/10 via-violet-500/10 to-fuchsia-500/10 scale-105" 
              : "border-border/50 hover:border-primary/50 hover:bg-gradient-to-br hover:from-purple-500/5 hover:via-violet-500/5 hover:to-fuchsia-500/5"
            }
            ${uploading ? "opacity-50 cursor-not-allowed" : "hover:scale-102"}
          `}
        >
          <input {...getInputProps()} />
          
          <div className="flex flex-col items-center justify-center text-center space-y-6">
            {uploading ? (
              <>
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-violet-500 rounded-full blur-xl opacity-50 animate-pulse" />
                  <Loader2 className="relative h-20 w-20 text-primary animate-spin" />
                </div>
                <div className="space-y-2">
                  <p className="text-xl font-semibold bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">
                    Processing your document...
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Analyzing structure with AI
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="relative">
                  {isDragActive ? (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-violet-500 rounded-full blur-2xl opacity-50 animate-pulse" />
                      <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-purple-500/50 animate-float">
                        <Upload className="h-12 w-12 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500/10 to-violet-500/10 border border-primary/20 flex items-center justify-center group-hover:border-primary/40 transition-all group-hover:shadow-lg group-hover:shadow-purple-500/20">
                      <FileText className="h-12 w-12 text-primary group-hover:scale-110 transition-transform" />
                      <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-primary animate-pulse" />
                    </div>
                  )}
                </div>
                
                <div className="space-y-3">
                  <p className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                    {isDragActive
                      ? "Drop it like it's hot!"
                      : "Drop your document here"}
                  </p>
                  <p className="text-base text-muted-foreground">
                    or <span className="text-primary font-medium">click to browse</span> your files
                  </p>
                </div>

                <div className="flex items-center gap-6 pt-4">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span className="text-muted-foreground">.docx format</span>
                  </div>
                  <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span className="text-muted-foreground">Up to 10MB</span>
                  </div>
                  <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span className="text-muted-foreground">Secure & Private</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-destructive/10 border border-destructive/50 rounded-2xl backdrop-blur-sm animate-slide-down">
          <p className="text-sm text-destructive font-medium">{error}</p>
        </div>
      )}
    </div>
  );
}
