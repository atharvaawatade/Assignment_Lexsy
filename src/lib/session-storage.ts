/**
 * Session storage for Vercel serverless environment
 * Uses process-level global storage that persists across requests in the same instance
 */

interface Session {
  fileName: string;
  fileBuffer: Buffer;
  createdAt: Date;
  fields?: any[];
  structure?: any;
  documentText?: string;
  filledFields?: Record<string, string>;
  conversationHistory?: any[];
  status?: string;
  changingField?: string;
}

// Create a singleton storage that persists at the module level
class SessionStore {
  private static instance: SessionStore;
  private store: Map<string, Session>;

  private constructor() {
    this.store = new Map<string, Session>();
    console.log('[SessionStore] Initialized new store instance');
  }

  public static getInstance(): SessionStore {
    if (!SessionStore.instance) {
      SessionStore.instance = new SessionStore();
    }
    return SessionStore.instance;
  }

  public set(sessionId: string, data: Session): void {
    this.store.set(sessionId, {
      ...data,
      createdAt: data.createdAt || new Date(),
    });
    console.log(`[SessionStore] Set session ${sessionId}. Total: ${this.store.size}`);
    console.log(`[SessionStore] Session keys:`, Array.from(this.store.keys()));
  }

  public get(sessionId: string): Session | undefined {
    const session = this.store.get(sessionId);
    console.log(`[SessionStore] Get session ${sessionId}. Found: ${!!session}`);
    console.log(`[SessionStore] Available sessions:`, Array.from(this.store.keys()));
    return session;
  }

  public has(sessionId: string): boolean {
    return this.store.has(sessionId);
  }

  public delete(sessionId: string): boolean {
    const result = this.store.delete(sessionId);
    console.log(`[SessionStore] Delete session ${sessionId}. Success: ${result}`);
    return result;
  }

  public clear(): void {
    this.store.clear();
    console.log('[SessionStore] Cleared all sessions');
  }

  public size(): number {
    return this.store.size;
  }

  public getAllKeys(): string[] {
    return Array.from(this.store.keys());
  }

  // Cleanup old sessions (older than 1 hour)
  public cleanup(): number {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    let cleaned = 0;
    for (const [sessionId, session] of this.store.entries()) {
      if (session.createdAt < oneHourAgo) {
        this.store.delete(sessionId);
        cleaned++;
      }
    }
    
    console.log(`[SessionStore] Cleaned ${cleaned} old sessions. Remaining: ${this.store.size}`);
    return cleaned;
  }
}

// Export singleton instance methods
const store = SessionStore.getInstance();

export const sessionStorage = {
  set: (sessionId: string, data: Session) => store.set(sessionId, data),
  get: (sessionId: string) => store.get(sessionId),
  has: (sessionId: string) => store.has(sessionId),
  delete: (sessionId: string) => store.delete(sessionId),
  clear: () => store.clear(),
  size: () => store.size(),
  getAllKeys: () => store.getAllKeys(),
  cleanup: () => store.cleanup(),
};
