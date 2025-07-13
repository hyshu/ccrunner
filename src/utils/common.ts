/**
 * Common utility functions used across the application
 */

/**
 * Formats an error into a string message
 * @param error - The error to format
 * @returns A string representation of the error
 */
export function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Truncates text to a specified length with ellipsis
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + '...';
}

/**
 * Formats multiline text for console output with proper indentation
 * @param text - The multiline text
 * @param indent - The indentation string
 * @param maxLines - Maximum number of lines to show
 * @returns Formatted text for console output
 */
export function formatMultilineText(text: string, indent: string, maxLines: number = 5): string[] {
  const lines = text.split('\n');
  const result: string[] = [];
  
  if (lines.length <= maxLines) {
    return lines.map(line => `${indent}${line}`);
  }
  
  // Show first few lines
  for (let i = 0; i < maxLines - 1; i++) {
    result.push(`${indent}${lines[i]}`);
  }
  
  // Add ellipsis message
  result.push(`${indent}... (${lines.length - (maxLines - 1)} more lines)`);
  
  return result;
}