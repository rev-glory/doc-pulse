"use client";

import React, { useState } from "react";

interface MarkdownViewerProps {
  markdown: string;
}

export function MarkdownViewer({
  markdown,
}: MarkdownViewerProps): React.JSX.Element {
  // Simple regex-based markdown parser to avoid external runtime dependencies
  const lines = markdown.split("\n");
  const renderedElements: React.JSX.Element[] = [];

  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let codeLang = "";

  let inTable = false;
  let tableRows: string[][] = [];

  let inList = false;
  let listItems: string[] = [];

  // Flush buffer functions
  const flushCodeBlock = (index: number) => {
    const code = codeBlockLines.join("\n");
    renderedElements.push(
      <CodeBlock key={`code-${index}`} code={code} language={codeLang} />,
    );
    codeBlockLines = [];
    inCodeBlock = false;
  };

  const flushTable = (index: number) => {
    renderedElements.push(
      <MarkdownTable key={`table-${index}`} rows={tableRows} />,
    );
    tableRows = [];
    inTable = false;
  };

  const flushList = (index: number) => {
    renderedElements.push(
      <ul
        key={`list-${index}`}
        className="list-disc pl-6 my-4 space-y-1.5 text-zinc-700 dark:text-zinc-300"
      >
        {listItems.map((item, idx) => (
          <li
            key={idx}
            dangerouslySetInnerHTML={{ __html: inlineStyle(item) }}
          />
        ))}
      </ul>,
    );
    listItems = [];
    inList = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;

    // Handle Code Block
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        flushCodeBlock(i);
      } else {
        if (inTable) flushTable(i);
        if (inList) flushList(i);
        inCodeBlock = true;
        codeLang = line.trim().slice(3).toLowerCase();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Handle Table
    if (line.trim().startsWith("|")) {
      if (inList) flushList(i);
      inTable = true;
      // Skip delimiter lines like |---|---|
      if (line.includes("---")) continue;
      const cells = line
        .split("|")
        .map((c) => c.trim())
        .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      tableRows.push(cells);
      continue;
    } else if (inTable) {
      flushTable(i);
    }

    // Handle List Item
    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      inList = true;
      listItems.push(line.trim().slice(2));
      continue;
    } else if (inList && line.trim() === "") {
      flushList(i);
    }

    // Empty Lines
    if (line.trim() === "") {
      continue;
    }

    // Headings
    if (line.startsWith("# ")) {
      renderedElements.push(
        <h1
          key={i}
          className="text-2xl font-extrabold text-zinc-900 dark:text-white mt-6 mb-3 border-b border-zinc-200 dark:border-zinc-800 pb-1.5"
        >
          {line.slice(2)}
        </h1>,
      );
    } else if (line.startsWith("## ")) {
      renderedElements.push(
        <h2
          key={i}
          className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-5 mb-2.5"
        >
          {line.slice(3)}
        </h2>,
      );
    } else if (line.startsWith("### ")) {
      renderedElements.push(
        <h3
          key={i}
          className="text-lg font-bold text-zinc-800 dark:text-zinc-200 mt-4 mb-2"
        >
          {line.slice(4)}
        </h3>,
      );
    } else {
      // Normal Paragraph
      renderedElements.push(
        <p
          key={i}
          className="my-3 leading-relaxed text-zinc-700 dark:text-zinc-300 text-sm"
          dangerouslySetInnerHTML={{ __html: inlineStyle(line) }}
        />,
      );
    }
  }

  // Flush remaining buffers
  if (inCodeBlock) flushCodeBlock(lines.length);
  if (inTable) flushTable(lines.length);
  if (inList) flushList(lines.length);

  return <div className="space-y-4 font-sans">{renderedElements}</div>;
}

// Inline styling: Bold, code quotes, links
function inlineStyle(text: string): string {
  let escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Bold (**bold**)
  escaped = escaped.replace(
    /\*\*(.*?)\*\*/g,
    '<strong class="font-semibold text-zinc-950 dark:text-white">$1</strong>',
  );

  // Inline Code (`code`)
  escaped = escaped.replace(
    /`(.*?)`/g,
    '<code class="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded font-mono text-xs">$1</code>',
  );

  // Links ([text](url))
  escaped = escaped.replace(
    /\[(.*?)\]\((.*?)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-emerald-600 hover:underline">$1</a>',
  );

  return escaped;
}

// Code Block Component with Copy Code button and light syntax highlighting
interface CodeBlockProps {
  code: string;
  language: string;
}

function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const highlight = (rawCode: string) => {
    if (
      !language ||
      ![
        "js",
        "ts",
        "tsx",
        "javascript",
        "typescript",
        "json",
        "bash",
        "shell",
      ].includes(language)
    ) {
      return rawCode;
    }

    // Simple keyword replacement highlighting
    let highlighted = rawCode
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // String highlights
    highlighted = highlighted.replace(
      /(["'])(.*?)\1/g,
      '<span class="text-emerald-500">$&</span>',
    );

    // JS/TS Keywords
    const keywords = [
      "const",
      "let",
      "var",
      "function",
      "class",
      "import",
      "export",
      "from",
      "return",
      "await",
      "async",
      "if",
      "else",
      "for",
      "while",
      "interface",
      "enum",
      "type",
      "default",
      "extends",
      "implements",
      "try",
      "catch",
      "throw",
    ];

    const keywordRegex = new RegExp(`\\b(${keywords.join("|")})\\b`, "g");
    highlighted = highlighted.replace(
      keywordRegex,
      '<span class="text-amber-500 font-bold">$1</span>',
    );

    // Numbers
    highlighted = highlighted.replace(
      /\b(\d+)\b/g,
      '<span class="text-indigo-400">$1</span>',
    );

    // Comments
    highlighted = highlighted.replace(
      /(\/\/.*)/g,
      '<span class="text-zinc-500 italic">$1</span>',
    );

    return highlighted;
  };

  return (
    <div className="relative my-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-950 text-zinc-100 font-mono text-xs overflow-hidden shadow-md">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
        <span className="text-[10px] tracking-wider text-zinc-400 uppercase font-semibold">
          {language || "text"}
        </span>
        <button
          onClick={handleCopy}
          type="button"
          className="p-1 px-2.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-sans font-semibold text-[10px] tracking-wide shadow-sm hover:text-white transition-all flex items-center gap-1"
        >
          {copied ? "✓ Copied" : "📋 Copy Code"}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto leading-relaxed">
        <code dangerouslySetInnerHTML={{ __html: highlight(code) }} />
      </pre>
    </div>
  );
}

// Markdown Table Component
interface MarkdownTableProps {
  rows: string[][];
}

function MarkdownTable({ rows }: MarkdownTableProps) {
  if (rows.length === 0) return null;
  const headers = rows[0];
  if (!headers) return null;
  const dataRows = rows.slice(1);

  return (
    <div className="overflow-x-auto my-5 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 uppercase tracking-wider font-semibold border-b border-zinc-200 dark:border-zinc-800">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
          {dataRows.map((row, idx) => (
            <tr
              key={idx}
              className={
                idx % 2 === 0
                  ? "bg-white dark:bg-zinc-950/20"
                  : "bg-zinc-50/50 dark:bg-zinc-900/10"
              }
            >
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} className="px-4 py-3 font-medium">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
