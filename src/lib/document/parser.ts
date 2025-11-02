import mammoth from "mammoth";

export interface ParsedDocument {
  text: string;
  html: string;
  structure: Array<{
    type: string;
    content: string;
  }>;
}

export async function parseDocx(buffer: Buffer): Promise<ParsedDocument> {
  try {
    // Extract text
    const textResult = await mammoth.extractRawText({ buffer });
    
    // Extract HTML for structure
    const htmlResult = await mammoth.convertToHtml({ buffer });

    // Parse structure from HTML
    const structure = parseStructure(htmlResult.value);

    return {
      text: textResult.value,
      html: htmlResult.value,
      structure,
    };
  } catch (error) {
    console.error("DOCX parsing error:", error);
    throw new Error("Failed to parse DOCX document");
  }
}

function parseStructure(html: string): Array<{ type: string; content: string }> {
  const structure: Array<{ type: string; content: string }> = [];
  
  // Simple HTML parsing - extract paragraphs and headings
  const paragraphRegex = /<p>(.*?)<\/p>/g;
  const headingRegex = /<h(\d)>(.*?)<\/h\d>/g;

  let match;
  
  // Extract headings
  while ((match = headingRegex.exec(html)) !== null) {
    structure.push({
      type: `heading${match[1]}`,
      content: stripHtml(match[2]),
    });
  }

  // Extract paragraphs
  while ((match = paragraphRegex.exec(html)) !== null) {
    const content = stripHtml(match[1]);
    if (content.trim()) {
      structure.push({
        type: "paragraph",
        content,
      });
    }
  }

  return structure;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

export function extractPlaceholders(text: string): string[] {
  // Match patterns like [Company Name], {Investor}, {{Date}}, etc.
  const patterns = [
    /\[([^\]]+)\]/g,  // [placeholder]
    /\{([^}]+)\}/g,   // {placeholder}
    /\{\{([^}]+)\}\}/g, // {{placeholder}}
    /_+([A-Z][A-Za-z\s]{3,})_+/g, // __PLACEHOLDER__ (min 3 chars after uppercase)
  ];

  const placeholders = new Set<string>();
  
  // MINIMAL filtering - only remove truly invalid patterns
  const ignorePatterns = [
    /^_+$/,                    // Only underscores
    /^[_\s-]+$/,              // Only underscores, spaces, or dashes
    /^\d+$/,                  // Only numbers
    /^[A-Z]$/,                // Single uppercase letter
    /^(the|and|or|a|an|of|to|in|for)$/i,   // Common articles/prepositions only
  ];

  const allFound: string[] = [];
  
  for (const pattern of patterns) {
    let match;
    // Reset lastIndex for global regex
    pattern.lastIndex = 0;
    
    while ((match = pattern.exec(text)) !== null) {
      const placeholder = match[1].trim();
      allFound.push(placeholder);
      
      // Only filter if truly invalid (too short or pure whitespace/symbols)
      if (placeholder.length < 2) continue;
      
      // Very minimal filtering - let AI handle the rest
      const shouldIgnore = ignorePatterns.some(ignorePattern => 
        ignorePattern.test(placeholder)
      );
      
      if (!shouldIgnore) {
        placeholders.add(placeholder);
      }
    }
  }

  console.log("\n📋 RAW EXTRACTION RESULTS:");
  console.log("Total matches found:", allFound.length);
  console.log("All matches:", allFound);
  console.log("After filtering:", placeholders.size);
  console.log("Unique placeholders:", Array.from(placeholders));
  
  // Deduplicate similar placeholders (case-insensitive)
  const deduped = deduplicatePlaceholders(Array.from(placeholders));
  
  console.log("After deduplication:", deduped.length);
  return deduped;
}

function deduplicatePlaceholders(placeholders: string[]): string[] {
  const seen = new Map<string, string>();
  
  for (const placeholder of placeholders) {
    const normalized = placeholder.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // If we haven't seen this normalized version, add it
    if (!seen.has(normalized)) {
      seen.set(normalized, placeholder);
    } else {
      // Keep the more descriptive version (longer or with more capitals)
      const existing = seen.get(normalized)!;
      if (placeholder.length > existing.length || 
          (placeholder.match(/[A-Z]/g)?.length || 0) > (existing.match(/[A-Z]/g)?.length || 0)) {
        seen.set(normalized, placeholder);
      }
    }
  }
  
  return Array.from(seen.values());
}
