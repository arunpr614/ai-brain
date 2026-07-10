export type NoteFormat =
  | "bold"
  | "italic"
  | "strike"
  | "h2"
  | "h3"
  | "bullet"
  | "ordered"
  | "task"
  | "quote"
  | "inline-code"
  | "code-block"
  | "link"
  | "rule";

export interface SelectionEdit {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

function wrap(value: string, start: number, end: number, before: string, after = before): SelectionEdit {
  const selected = value.slice(start, end);
  const fallback = selected || "text";
  const inserted = `${before}${fallback}${after}`;
  return {
    value: value.slice(0, start) + inserted + value.slice(end),
    selectionStart: start + before.length,
    selectionEnd: start + before.length + fallback.length,
  };
}

function prefixLines(
  value: string,
  start: number,
  end: number,
  prefix: (index: number) => string,
): SelectionEdit {
  const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const nextLine = value.indexOf("\n", end);
  const lineEnd = nextLine === -1 ? value.length : nextLine;
  const original = value.slice(lineStart, lineEnd);
  const updated = original
    .split("\n")
    .map((line, index) => `${prefix(index)}${line}`)
    .join("\n");
  return {
    value: value.slice(0, lineStart) + updated + value.slice(lineEnd),
    selectionStart: lineStart,
    selectionEnd: lineStart + updated.length,
  };
}

export function applyNoteFormat(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  format: NoteFormat,
): SelectionEdit {
  switch (format) {
    case "bold":
      return wrap(value, selectionStart, selectionEnd, "**");
    case "italic":
      return wrap(value, selectionStart, selectionEnd, "_");
    case "strike":
      return wrap(value, selectionStart, selectionEnd, "~~");
    case "inline-code":
      return wrap(value, selectionStart, selectionEnd, "`");
    case "code-block":
      return wrap(value, selectionStart, selectionEnd, "```\n", "\n```");
    case "link": {
      const selected = value.slice(selectionStart, selectionEnd) || "link text";
      const inserted = `[${selected}](https://)`;
      return {
        value: value.slice(0, selectionStart) + inserted + value.slice(selectionEnd),
        selectionStart: selectionStart + selected.length + 3,
        selectionEnd: selectionStart + selected.length + 11,
      };
    }
    case "h2":
      return prefixLines(value, selectionStart, selectionEnd, () => "## ");
    case "h3":
      return prefixLines(value, selectionStart, selectionEnd, () => "### ");
    case "bullet":
      return prefixLines(value, selectionStart, selectionEnd, () => "- ");
    case "ordered":
      return prefixLines(value, selectionStart, selectionEnd, (index) => `${index + 1}. `);
    case "task":
      return prefixLines(value, selectionStart, selectionEnd, () => "- [ ] ");
    case "quote":
      return prefixLines(value, selectionStart, selectionEnd, () => "> ");
    case "rule": {
      const inserted = `${selectionStart > 0 && value[selectionStart - 1] !== "\n" ? "\n" : ""}---\n`;
      return {
        value: value.slice(0, selectionStart) + inserted + value.slice(selectionEnd),
        selectionStart: selectionStart + inserted.length,
        selectionEnd: selectionStart + inserted.length,
      };
    }
  }
}

