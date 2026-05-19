"use client";

/**
 * Lightweight markdown renderer for AI chat replies — shared by every
 * AI assistant widget. Supports bold/italic/code inline, headings, tables,
 * lists, blockquotes and horizontal rules.
 */

export function formatInline(text: string): React.ReactNode {
  // Split on **bold**, *italic*, and `code`
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**"))
          return (
            <strong key={i} className="font-semibold">
              {part.slice(2, -2)}
            </strong>
          );
        if (part.startsWith("*") && part.endsWith("*"))
          return <em key={i}>{part.slice(1, -1)}</em>;
        if (part.startsWith("`") && part.endsWith("`"))
          return (
            <code
              key={i}
              className="rounded bg-black/10 px-1 py-0.5 text-[11px] font-mono dark:bg-white/10"
            >
              {part.slice(1, -1)}
            </code>
          );
        return part;
      })}
    </>
  );
}

export function MessageContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Horizontal rule
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      nodes.push(<hr key={i} className="my-2 border-current opacity-20" />);
      i++;
      continue;
    }

    // Headings
    if (line.startsWith("### ")) {
      nodes.push(
        <p
          key={i}
          className="mt-3 mb-1 text-[11px] font-bold uppercase tracking-wider opacity-60"
        >
          {formatInline(line.slice(4))}
        </p>
      );
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      nodes.push(
        <p key={i} className="mt-3 mb-1 text-sm font-bold">
          {formatInline(line.slice(3))}
        </p>
      );
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      nodes.push(
        <p key={i} className="mt-2 mb-1 text-sm font-extrabold">
          {formatInline(line.slice(2))}
        </p>
      );
      i++;
      continue;
    }

    // Blockquote / callout
    if (line.startsWith("> ")) {
      nodes.push(
        <div
          key={i}
          className="my-1 border-l-2 border-current pl-3 opacity-80 text-xs italic"
        >
          {formatInline(line.slice(2))}
        </div>
      );
      i++;
      continue;
    }

    // Table — collect all consecutive | lines
    if (line.startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = tableLines
        .filter((r) => !/^\|[-:| ]+\|$/.test(r.trim()))
        .map((r) => r.split("|").slice(1, -1).map((c) => c.trim()));
      if (rows.length > 0) {
        nodes.push(
          <div
            key={`table-${i}`}
            className="my-2 overflow-x-auto rounded-lg border border-current/20"
          >
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-current/20 bg-current/5">
                  {rows[0].map((h, ci) => (
                    <th
                      key={ci}
                      className="px-2.5 py-1.5 text-left font-semibold"
                    >
                      {formatInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(1).map((row, ri) => (
                  <tr
                    key={ri}
                    className="border-b border-current/10 last:border-0"
                  >
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-2.5 py-1.5">
                        {formatInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ""));
        i++;
      }
      nodes.push(
        <ol key={`ol-${i}`} className="my-1 space-y-0.5 list-none">
          {items.map((item, idx) => (
            <li key={idx} className="flex gap-2">
              <span className="shrink-0 font-semibold opacity-60">
                {idx + 1}.
              </span>
              <span>{formatInline(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Bullet list
    if (
      line.startsWith("- ") ||
      line.startsWith("• ") ||
      line.startsWith("* ")
    ) {
      const items: string[] = [];
      while (
        i < lines.length &&
        (lines[i].startsWith("- ") ||
          lines[i].startsWith("• ") ||
          lines[i].startsWith("* "))
      ) {
        items.push(lines[i].slice(2));
        i++;
      }
      nodes.push(
        <ul key={`ul-${i}`} className="my-1 space-y-0.5">
          {items.map((item, idx) => (
            <li key={idx} className="flex gap-1.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-50" />
              <span>{formatInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      nodes.push(<div key={i} className="h-1.5" />);
      i++;
      continue;
    }

    // Plain paragraph
    nodes.push(<p key={i}>{formatInline(line)}</p>);
    i++;
  }

  return <div className="space-y-0.5 text-sm leading-relaxed">{nodes}</div>;
}
