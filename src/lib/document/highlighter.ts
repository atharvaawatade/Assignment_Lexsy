import type { Field } from "@/agents/core/types";

/**
 * Highlight fields in document text for preview
 */
export function highlightFields(
  text: string,
  fields: Field[],
  filledFields: Record<string, string>
): string {
  let highlightedText = text;

  // Replace each field's placeholder with highlighted version
  fields.forEach((field) => {
    const value = filledFields[field.id];
    const escapedPlaceholder = field.placeholder.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const patterns = [
      new RegExp(`\\[${escapedPlaceholder}\\]`, "gi"),
      new RegExp(`\\{${escapedPlaceholder}\\}`, "gi"),
      new RegExp(`\\{\\{${escapedPlaceholder}\\}\\}`, "gi"),
    ];

    patterns.forEach((pattern) => {
      if (value) {
        // Filled field - green highlight
        highlightedText = highlightedText.replace(
          pattern,
          `<span class="field-filled" data-field-id="${field.id}">${value}</span>`
        );
      } else {
        // Pending field - yellow highlight with placeholder
        highlightedText = highlightedText.replace(
          pattern,
          `<span class="field-pending" data-field-id="${field.id}">[${field.placeholder}]</span>`
        );
      }
    });
  });

  return highlightedText;
}

/**
 * Add click handlers to highlighted fields
 */
export function addFieldClickHandlers(
  container: HTMLElement,
  fields: Field[],
  onFieldClick?: (field: Field) => void
): void {
  if (!onFieldClick) return;

  // Find all field spans
  const fieldSpans = container.querySelectorAll("[data-field-id]");

  fieldSpans.forEach((span) => {
    const fieldId = span.getAttribute("data-field-id");
    const field = fields.find((f) => f.id === fieldId);

    if (field) {
      span.addEventListener("click", () => onFieldClick(field));
      (span as HTMLElement).style.cursor = "pointer";
    }
  });
}

/**
 * Generate field markers for document
 */
export function generateFieldMarkers(fields: Field[]): Map<string, string> {
  const markers = new Map<string, string>();

  fields.forEach((field) => {
    // Create unique marker for each field
    const marker = `{{${field.id}}}`;
    markers.set(field.placeholder, marker);
  });

  return markers;
}
