import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Field, Message } from "@/agents/core/types";

interface SessionState {
  sessionId: string | null;
  fileName: string | null;
  fileBuffer: ArrayBuffer | null;
  status: "idle" | "uploading" | "parsing" | "chatting" | "generating" | "complete";
  fields: Field[];
  filledFields: Record<string, string>;
  conversationHistory: Message[];
  documentStructure: any[];
  error: string | null;

  // Actions
  setSession: (sessionId: string, fileName: string, fileBuffer: ArrayBuffer) => void;
  setStatus: (status: SessionState["status"]) => void;
  setFields: (fields: Field[]) => void;
  setFilledField: (fieldId: string, value: string) => void;
  addMessage: (message: Message) => void;
  setDocumentStructure: (structure: any[]) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  sessionId: null,
  fileName: null,
  fileBuffer: null,
  status: "idle" as const,
  fields: [],
  filledFields: {},
  conversationHistory: [],
  documentStructure: [],
  error: null,
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      ...initialState,

      setSession: (sessionId, fileName, fileBuffer) =>
        set({ sessionId, fileName, fileBuffer, status: "uploading" }),

      setStatus: (status) => set({ status }),

      setFields: (fields) => set({ fields }),

      setFilledField: (fieldId, value) =>
        set((state) => ({
          filledFields: { ...state.filledFields, [fieldId]: value },
        })),

      addMessage: (message) =>
        set((state) => ({
          conversationHistory: [...state.conversationHistory, message],
        })),

      setDocumentStructure: (structure) =>
        set({ documentStructure: structure }),

      setError: (error) => set({ error }),

      reset: () => set(initialState),
    }),
    {
      name: "lawtech-session",
      partialize: (state) => ({
        sessionId: state.sessionId,
        fileName: state.fileName,
        fields: state.fields,
        filledFields: state.filledFields,
        conversationHistory: state.conversationHistory,
        documentStructure: state.documentStructure,
      }),
    }
  )
);
