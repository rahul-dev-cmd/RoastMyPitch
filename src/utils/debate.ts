export function extractScore(text: string): number | null {
  const match = text.match(/FINAL SCORE:\s*(\d+)\/100/i);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return null;
}
