import { UploadZone } from "@/components/document/upload-zone";
import { Sparkles, Zap, Shield } from "lucide-react";

export default function UploadPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-950/20 via-background to-violet-950/20 animate-gradient" />
      
      {/* Floating orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4">
        {/* Header */}
        <div className="mb-12 text-center space-y-4 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Next-Gen Legal AI</span>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-purple-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent animate-gradient">
            LawTech
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Transform legal documents in <span className="text-primary font-semibold">seconds</span> with AI-powered intelligence
          </p>
        </div>

        {/* Upload Zone */}
        <div className="animate-scale-in">
          <UploadZone />
        </div>

        {/* Features Grid */}
        <div className="mt-20 max-w-5xl w-full animate-slide-in-bottom">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-violet-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all opacity-0 group-hover:opacity-100" />
              <div className="relative p-8 rounded-3xl bg-card/80 backdrop-blur-xl border border-border/50 hover:border-primary/50 transition-all duration-300 hover:scale-105">
                <div className="w-14 h-14 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/50">
                  <span className="text-3xl">📄</span>
                </div>
                <div className="space-y-3">
                  <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 text-white text-sm font-bold mb-2 shadow-lg shadow-purple-500/30">
                    1
                  </div>
                  <h3 className="font-bold text-xl bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">
                    Upload
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Drop your legal document and let our AI analyze its structure instantly
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all opacity-0 group-hover:opacity-100" />
              <div className="relative p-8 rounded-3xl bg-card/80 backdrop-blur-xl border border-border/50 hover:border-primary/50 transition-all duration-300 hover:scale-105">
                <div className="w-14 h-14 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/50">
                  <Zap className="w-7 h-7 text-white" />
                </div>
                <div className="space-y-3">
                  <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white text-sm font-bold mb-2 shadow-lg shadow-violet-500/30">
                    2
                  </div>
                  <h3 className="font-bold text-xl bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                    Interact
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Natural conversation with AI to complete fields intelligently
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/20 to-purple-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all opacity-0 group-hover:opacity-100" />
              <div className="relative p-8 rounded-3xl bg-card/80 backdrop-blur-xl border border-border/50 hover:border-primary/50 transition-all duration-300 hover:scale-105">
                <div className="w-14 h-14 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center shadow-lg shadow-fuchsia-500/50">
                  <span className="text-3xl">✨</span>
                </div>
                <div className="space-y-3">
                  <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white text-sm font-bold mb-2 shadow-lg shadow-fuchsia-500/30">
                    3
                  </div>
                  <h3 className="font-bold text-xl bg-gradient-to-r from-fuchsia-400 to-purple-400 bg-clip-text text-transparent">
                    Export
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Download your completed, legally-ready document in seconds
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trust badges */}
        <div className="mt-16 flex items-center gap-8 text-sm text-muted-foreground animate-fade-in">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <span>Enterprise Security</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>AI-Powered</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span>Lightning Fast</span>
          </div>
        </div>
      </div>
    </div>
  );
}
