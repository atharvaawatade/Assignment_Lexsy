"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit2, Check, X } from "lucide-react";
import type { Field } from "@/agents/core/types";

interface DocumentPreviewProps {
  fields: Field[];
  filledFields: Record<string, string>;
  documentStructure?: any[];
  onFieldUpdate?: (fieldId: string, value: string) => void;
}

export function DocumentPreview({
  fields,
  filledFields,
  documentStructure,
  onFieldUpdate,
}: DocumentPreviewProps) {
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  
  const filledCount = Object.keys(filledFields).length;
  const totalCount = fields.length;
  // Cap progress at 100% to handle edge cases where filledCount > totalCount
  const rawProgress = totalCount > 0 ? (filledCount / totalCount) * 100 : 0;
  const progress = Math.min(rawProgress, 100);

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

  return (
    <Card className="h-full shadow-2xl border border-purple-500/20 bg-gradient-to-br from-card/95 via-purple-950/20 to-card/95 backdrop-blur-xl relative flex flex-col">
      {/* Subtle background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-violet-600/10 pointer-events-none -z-10" />
      
      {/* Fixed Header with Progress */}
      <div className="p-6 pb-0 shrink-0">
        {/* Progress Section */}
        <div className="relative mb-6 space-y-4 p-5 rounded-2xl bg-gradient-to-br from-purple-500/15 via-violet-500/10 to-transparent border border-purple-500/30 shadow-lg shadow-purple-500/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">
              Completion Progress
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {filledCount === totalCount ? '🎉 All fields filled!' : 'Fill all fields to continue'}
            </p>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-4xl font-black bg-gradient-to-br from-purple-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              {Math.round(progress)}%
            </span>
            <span className="text-xs text-muted-foreground mt-1">
              {filledCount}/{totalCount} done
            </span>
          </div>
        </div>
        
        {/* Enhanced Progress Bar */}
        <div className="relative w-full bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-full h-4 overflow-hidden shadow-inner border border-gray-700/50">
          <div
            className="bg-gradient-to-r from-purple-500 via-violet-500 to-fuchsia-500 h-4 rounded-full transition-all duration-700 ease-out relative overflow-hidden"
            style={{ width: `${progress}%` }}
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          </div>
          {/* Percentage indicator */}
          {progress > 10 && (
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-white drop-shadow-lg">
              {Math.round(progress)}%
            </span>
          )}
        </div>
        </div>
      </div>

      {/* Scrollable Fields List */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
      <div className="relative space-y-4">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold bg-gradient-to-r from-purple-700 to-purple-900 dark:from-purple-300 dark:to-purple-500 bg-clip-text text-transparent">
            Document Fields
          </h3>
          <div className="flex gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 font-medium border border-green-500/20">
              ● {filledCount} Filled
            </span>
            <span className="px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 font-medium border border-orange-500/20">
              ● {totalCount - filledCount} Pending
            </span>
          </div>
        </div>
        
        {fields.length === 0 ? (
          <div className="text-center py-12 px-6 rounded-2xl bg-muted/30 border-2 border-dashed border-muted-foreground/20">
            <div className="text-4xl mb-3">📄</div>
            <p className="text-muted-foreground font-medium">No fields detected</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Upload a document to get started</p>
          </div>
        ) : (
          fields.map((field, index) => {
            const isFilled = !!filledFields[field.id];
            const value = filledFields[field.id];

            return (
              <div
                key={field.id}
                className={`group relative p-5 rounded-2xl border-2 transition-all duration-500 animate-slide-in-right hover:scale-[1.02] z-10 ${
                  isFilled
                    ? "bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border-purple-400/40 dark:border-purple-600/40 shadow-lg shadow-purple-500/10 hover:shadow-xl hover:shadow-purple-500/20"
                    : "bg-gradient-to-br from-white via-purple-50/20 to-white dark:from-gray-900 dark:via-purple-950/20 dark:to-gray-900 border-purple-200/40 dark:border-purple-800/40 hover:border-purple-400/60 hover:shadow-lg hover:from-purple-500/5"
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Premium field number badge */}
                <div className={`absolute -left-3 -top-3 w-8 h-8 rounded-xl rotate-6 group-hover:rotate-0 transition-transform duration-300 flex items-center justify-center text-xs font-bold shadow-lg z-20 ${
                  isFilled 
                    ? "bg-gradient-to-br from-purple-500 to-purple-700 text-white" 
                    : "bg-gradient-to-br from-purple-600 to-purple-800 dark:from-purple-500 dark:to-purple-700 text-white"
                }`}>
                  {index + 1}
                </div>
                
                {/* Status badge */}
                <div className={`absolute -right-2 -top-2 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide shadow-lg z-20 ${
                  isFilled
                    ? "bg-gradient-to-r from-purple-500 to-purple-700 text-white"
                    : "bg-gradient-to-r from-gray-500 to-gray-700 dark:from-gray-600 dark:to-gray-800 text-white"
                }`}>
                  {isFilled ? "✓ Done" : "⏳ Pending"}
                </div>
                
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 space-y-1">
                    <span className="text-base font-bold text-gray-900 dark:text-white block group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">
                      {field.placeholder}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                        field.type === 'date' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                        field.type === 'currency' ? 'bg-green-500/10 text-green-600 dark:text-green-400' :
                        field.type === 'enum' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' :
                        'bg-gray-500/10 text-gray-600 dark:text-gray-400'
                      }`}>
                        {field.type === 'date' ? '📅 Date Field' : 
                         field.type === 'currency' ? '💰 Currency' : 
                         field.type === 'enum' ? '📋 Selection' : 
                         '✏️ Text Input'}
                      </span>
                      {field.required && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400 font-bold">
                          REQUIRED
                        </span>
                      )}
                    </div>
                  </div>
                  {isFilled && editingFieldId !== field.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(field.id, value)}
                      className="h-9 px-3 hover:bg-purple-500/10 hover:text-purple-700 dark:hover:text-purple-400 transition-all duration-200 hover:scale-105 active:scale-95 group/btn border border-purple-300/20 dark:border-purple-700/20 z-20 relative"
                      title="Click to edit"
                    >
                      <Edit2 className="h-4 w-4 mr-1.5 group-hover/btn:rotate-12 transition-transform" />
                      <span className="text-xs font-semibold">Edit</span>
                    </Button>
                  )}
                </div>
                {isFilled ? (
                  editingFieldId === field.id ? (
                    <div className="mt-3 space-y-3 p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-transparent border-2 border-purple-500/40 dark:border-purple-600/40 animate-slide-down shadow-lg shadow-purple-500/10">
                      <div className="relative">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full px-4 py-3 text-sm font-medium border-2 border-purple-500/50 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-600 bg-white dark:bg-gray-900 backdrop-blur-sm shadow-inner transition-all"
                          placeholder={field.placeholder}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSave(field.id);
                            if (e.key === 'Escape') handleCancel();
                          }}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-medium">
                          Press Enter ↵
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSave(field.id)}
                          className="flex-1 h-9 text-xs font-bold bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
                        >
                          <Check className="h-4 w-4 mr-1.5" />
                          Save Changes
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancel}
                          className="h-9 px-4 text-xs font-semibold hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 p-4 bg-gradient-to-br from-purple-50/50 to-purple-100/30 dark:from-purple-950/30 dark:to-purple-900/20 rounded-xl border-2 border-purple-200/50 dark:border-purple-700/50 shadow-inner group-hover:border-purple-400/60 dark:group-hover:border-purple-500/60 transition-all">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-relaxed flex-1">
                          {value}
                        </p>
                        <div className="shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-md">
                          <Check className="h-3.5 w-3.5 text-white" />
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="mt-3 p-4 rounded-xl border-2 border-dashed border-gray-300/40 dark:border-gray-700/40 bg-gray-100/30 dark:bg-gray-800/20 group-hover:border-purple-400/50 group-hover:bg-purple-500/5 transition-all">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                      <span className="font-medium italic">Waiting for AI assistant...</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      </div>
    </Card>
  );
}
