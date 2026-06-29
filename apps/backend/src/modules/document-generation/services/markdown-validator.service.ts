import { Injectable } from "@nestjs/common";

export interface MarkdownWarning {
  line?: number;
  message: string;
}

export interface MarkdownError {
  line?: number;
  message: string;
}

export interface MarkdownValidationResult {
  valid: boolean;
  warnings: MarkdownWarning[];
  errors: MarkdownError[];
}

@Injectable()
export class MarkdownValidatorService {
  /**
   * Validates markdown structure returning granular diagnostic warnings and errors.
   */
  public validate(markdown: string): MarkdownValidationResult {
    const warnings: MarkdownWarning[] = [];
    const errors: MarkdownError[] = [];

    if (!markdown || !markdown.trim()) {
      return {
        valid: false,
        warnings: [],
        errors: [{ message: "Document content is completely empty" }],
      };
    }

    const lines = markdown.split("\n");
    let hasHeading = false;
    let codeFenceCount = 0;
    const seenHeadings = new Set<string>();

    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const rawLine = lines[i];
      if (rawLine === undefined) continue;
      const line = rawLine.trim();

      if (line.startsWith("```")) {
        codeFenceCount++;
        continue;
      }

      if (codeFenceCount % 2 !== 0) {
        continue;
      }

      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch && headingMatch[1] && headingMatch[2]) {
        hasHeading = true;
        const level = headingMatch[1].length;
        const title = headingMatch[2].trim();
        const headingKey = `${level}:${title.toLowerCase()}`;

        if (seenHeadings.has(headingKey)) {
          warnings.push({
            line: lineNum,
            message: `Duplicate level ${level} heading found: "${title}"`,
          });
        } else {
          seenHeadings.add(headingKey);
        }

        let nextContentLineIndex = i + 1;
        let isSectionEmpty = true;
        while (nextContentLineIndex < lines.length) {
          const rawNext = lines[nextContentLineIndex];
          if (rawNext === undefined) {
            nextContentLineIndex++;
            continue;
          }
          const nextLine = rawNext.trim();
          if (nextLine.startsWith("```")) {
            isSectionEmpty = false;
            break;
          }
          if (nextLine && !nextLine.match(/^(#{1,6})\s+/)) {
            isSectionEmpty = false;
            break;
          }
          if (nextLine.match(/^(#{1,6})\s+/)) {
            break;
          }
          nextContentLineIndex++;
        }

        if (isSectionEmpty) {
          warnings.push({
            line: lineNum,
            message: `Heading "${title}" contains an empty section with no descriptive content`,
          });
        }
      }
    }

    if (!hasHeading) {
      errors.push({
        message: "Document contains no Markdown headings (H1-H6)",
      });
    }

    if (codeFenceCount % 2 !== 0) {
      errors.push({
        message: `Unclosed Markdown code fence (found ${codeFenceCount} backtick fences)`,
      });
    }

    return {
      valid: errors.length === 0,
      warnings,
      errors,
    };
  }
}
