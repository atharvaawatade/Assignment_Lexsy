"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit3, Check, X } from "lucide-react";
import type { Field } from "@/agents/core/types";

interface LiveDocumentPreviewProps {
  fields: Field[];
  filledFields: Record<string, string>;
  documentText?: string;
  onFieldUpdate?: (fieldId: string, value: string) => void;
}

export function LiveDocumentPreview({
  fields,
  filledFields,
  documentText,
  onFieldUpdate,
}: LiveDocumentPreviewProps) {
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleEdit = (fieldId: string, currentValue: string) => {
    setEditingFieldId(fieldId);
    setEditValue(currentValue);
  };

  const handleSave = (fieldId: string) => {
    if (onFieldUpdate && editValue.trim()) {
      onFieldUpdate(fieldId, editValue);
    }
    setEditingFieldId(null);
    setEditValue("");
  };

  const handleCancel = () => {
    setEditingFieldId(null);
    setEditValue("");
  };
  // Generate a preview of the document with filled values
  const renderDocumentPreview = () => {
    // If we have document text, use it; otherwise show placeholder
    if (!documentText) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <p>Document preview will appear here once loaded...</p>
        </div>
      );
    }

    // Replace placeholders in document text with filled values
    let previewText = documentText;
    
    // Replace each field's placeholder with its value (or keep placeholder if not filled)
    fields.forEach(field => {
      const value = filledFields[field.id];
      const patterns = [
        new RegExp(`\\[${field.placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'gi'),
        new RegExp(`\\{${field.placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}`, 'gi'),
      ];
      
      patterns.forEach(pattern => {
        if (value) {
          // Replace with filled value (green)
          previewText = previewText.replace(pattern, `<FILLED id="${field.id}">${value}</FILLED>`);
        } else {
          // Keep placeholder (yellow)
          previewText = previewText.replace(pattern, `<PENDING>[${field.placeholder}]</PENDING>`);
        }
      });
    });

    // Split into paragraphs and render
    const paragraphs = previewText.split('\n').filter(p => p.trim());
    
    return (
      <div className="space-y-3 text-sm leading-relaxed">
        {paragraphs.map((para, idx) => {
          // Parse the paragraph for FILLED and PENDING markers (with optional attributes)
          const parts = para.split(/(<FILLED[^>]*>.*?<\/FILLED>|<PENDING[^>]*>.*?<\/PENDING>)/);
          
          return (
            <p key={idx} className="text-justify">
              {parts.map((part, partIdx) => {
                if (part.startsWith('<FILLED')) {
                  // Extract id and inner text
                  const match = part.match(/<FILLED[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/FILLED>/);
                  const fieldId = match?.[1];
                  const text = match?.[2] ?? '';
                  const field = fields.find((f) => f.id === fieldId);

                  if (fieldId && editingFieldId === fieldId) {
                    return (
                      <span key={partIdx} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/10 border-2 border-purple-500 animate-pulse">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && fieldId) handleSave(fieldId);
                            if (e.key === 'Escape') handleCancel();
                          }}
                          className="bg-white dark:bg-gray-900 px-2 py-0.5 rounded border-2 border-purple-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={() => fieldId && handleSave(fieldId)}
                          className="h-6 w-6 p-0 bg-green-500 hover:bg-green-600"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancel}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </span>
                    );
                  }
                  
                  return (
                    <span key={partIdx} className="group/edit inline-flex items-center gap-1.5 font-semibold text-purple-700 dark:text-purple-300 bg-gradient-to-r from-purple-100 to-purple-50 dark:from-purple-900/40 dark:to-purple-900/20 px-2.5 py-1 rounded-lg border-2 border-purple-300 dark:border-purple-700 hover:border-purple-500 transition-all hover:shadow-lg hover:shadow-purple-500/20">
                      <span>{text}</span>
                      {fieldId && onFieldUpdate && (
                        <button
                          onClick={() => handleEdit(fieldId, text)}
                          className="opacity-0 group-hover/edit:opacity-100 transition-opacity p-0.5 hover:bg-purple-500 hover:text-white rounded-md"
                          title="Click to edit"
                        >
                          <Edit3 className="h-3 w-3" />
                        </button>
                      )}
                    </span>
                  );
                } else if (part.startsWith('<PENDING')) {
                  const match = part.match(/<PENDING[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/PENDING>/);
                  const text = match?.[2] ?? '';
                  return (
                    <span key={partIdx} className="font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-700">
                      {text}
                    </span>
                  );
                }
                return <span key={partIdx}>{part}</span>;
              })}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <Card className="h-full shadow-2xl border-2 border-purple-200/50 dark:border-purple-800/50 bg-gradient-to-br from-white/95 via-purple-50/30 to-white/95 dark:from-gray-900/95 dark:via-purple-950/30 dark:to-gray-900/95 backdrop-blur-xl flex flex-col">
      <div className="p-6 pb-4 border-b-2 border-purple-200 dark:border-purple-800 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-purple-800 dark:from-purple-400 dark:to-purple-600 bg-clip-text text-transparent">Text Preview</h3>
          <div className="flex-1 h-px bg-gradient-to-r from-purple-300 to-transparent dark:from-purple-700"></div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Click <Edit3 className="inline h-3 w-3 text-purple-600 dark:text-purple-400" /> on any filled field to edit
          </p>
          <div className="flex gap-2 text-[10px]">
            <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold border border-purple-500/20">
              ● Filled
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20">
              ● Pending
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="prose prose-sm max-w-none">
          {renderDocumentPreview()}
        </div>
      </div>
    </Card>
  );
}
