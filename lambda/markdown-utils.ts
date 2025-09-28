export function compressMarkdownWhitespace(markdown: string): string {
  if (!markdown) return "";

  // Split by fenced code blocks to avoid altering code formatting
  const segments: string[] = [];
  const fenceRegex = /```[\s\S]*?```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = fenceRegex.exec(markdown)) !== null) {
    // Push non-code segment
    segments.push(markdown.slice(lastIndex, match.index));
    // Push code segment as-is
    segments.push(match[0]);
    lastIndex = match.index + match[0].length;
  }
  // Push remaining tail
  segments.push(markdown.slice(lastIndex));

  const processed = segments
    .map((segment) => {
      const isCodeBlock = segment.startsWith("```");

      if (isCodeBlock) return segment; // keep code blocks untouched

      // Normalize whitespace in non-code segments
      return (
        segment
          // Trim trailing spaces on each line
          .replace(/[ \t]+$/gm, "")
          // Convert Windows/Mac newlines to \n
          .replace(/\r\n?|\u2028|\u2029/g, "\n")
          // Collapse 3+ blank lines to a single blank line
          .replace(/\n{1,}/g, "\n\n")
          // Collapse multiple spaces around headings/lists while preserving single
          .replace(/^(\s{0,3}[#>\-\*\+]\s)\s+/gm, "$1")
          // Collapse runs of spaces greater than 2 within paragraphs
          .replace(/([^`]) {3,}/g, "$1  ")
          // Trim overall
          .trim()
      );
    })
    .join("");

  return processed;
}
