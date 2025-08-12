/**
 * Utility function to clean and parse JSON content that may be wrapped in markdown code blocks
 */
export function cleanAndParseJSON(content: string): any {
  let cleanContent = content.trim();
  
  // Remove markdown code block syntax if present
  if (cleanContent.startsWith('```json')) {
    cleanContent = cleanContent.replace(/^```json\s*/, '');
  }
  if (cleanContent.startsWith('```')) {
    cleanContent = cleanContent.replace(/^```\s*/, '');
  }
  if (cleanContent.endsWith('```')) {
    cleanContent = cleanContent.replace(/\s*```$/, '');
  }
  
  // Remove any trailing/leading whitespace and newlines
  cleanContent = cleanContent.trim();
  
  // Try to extract JSON if it's embedded in other text
  const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleanContent = jsonMatch[0];
  }
  
  return JSON.parse(cleanContent);
}

/**
 * Safe JSON parsing with fallback
 */
export function safeJsonParse(content: string, fallback: any = null): any {
  try {
    return cleanAndParseJSON(content);
  } catch (error) {
    console.warn('Failed to parse JSON content:', error.message);
    console.warn('Original content:', content);
    return fallback;
  }
}