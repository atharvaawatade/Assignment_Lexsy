import { Document, Packer, Paragraph, TextRun } from "docx";
import mammoth from "mammoth";

export async function generateDocx(
  templateBuffer: Buffer,
  fields: Record<string, string>
): Promise<Buffer> {
  try {
    console.log("\n=== DOCUMENT GENERATION ===");
    console.log("Fields to replace:", Object.keys(fields));
    
    // Parse the template to get text
    const result = await mammoth.extractRawText({ buffer: templateBuffer });
    let text = result.value;
    
    console.log("Original text length:", text.length);
    console.log("Sample text:", text.substring(0, 500));

    // Replace all placeholders with actual values
    for (const [placeholder, value] of Object.entries(fields)) {
      console.log(`\nReplacing "${placeholder}" with "${value}"`);
      
      // Escape special regex characters in placeholder name
      const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      
      // Try multiple placeholder formats with case-insensitive matching
      const patterns = [
        new RegExp(`\\[${escapedPlaceholder}\\]`, "gi"),
        new RegExp(`\\{${escapedPlaceholder}\\}`, "gi"),
        new RegExp(`\\{\\{${escapedPlaceholder}\\}\\}`, "gi"),
        new RegExp(`_+${escapedPlaceholder}_+`, "gi"),
      ];

      let replacementCount = 0;
      for (const pattern of patterns) {
        const matches = text.match(pattern);
        if (matches) {
          console.log(`  Found ${matches.length} matches for pattern: ${pattern}`);
          replacementCount += matches.length;
        }
        text = text.replace(pattern, value);
      }
      
      if (replacementCount === 0) {
        console.warn(`  ⚠️  No matches found for "${placeholder}"`);
      }
    }

    console.log("\nFinal text length:", text.length);
    console.log("Sample replaced text:", text.substring(0, 500));
    console.log("=========================\n");

    // Create a new document with the filled text
    const paragraphs = text.split("\n").map(
      (line) =>
        new Paragraph({
          children: [new TextRun(line)],
        })
    );

    const doc = new Document({
      sections: [
        {
          children: paragraphs,
        },
      ],
    });

    // Generate buffer
    const buffer = await Packer.toBuffer(doc);
    return buffer;
  } catch (error) {
    console.error("Document generation error:", error);
    throw new Error("Failed to generate document");
  }
}

export function replacePlaceholders(
  text: string,
  fields: Record<string, string>
): string {
  let result = text;

  for (const [placeholder, value] of Object.entries(fields)) {
    const patterns = [
      new RegExp(`\\[${escapeRegex(placeholder)}\\]`, "gi"),
      new RegExp(`\\{${escapeRegex(placeholder)}\\}`, "gi"),
      new RegExp(`\\{\\{${escapeRegex(placeholder)}\\}\\}`, "gi"),
    ];

    for (const pattern of patterns) {
      result = result.replace(pattern, value);
    }
  }

  return result;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
