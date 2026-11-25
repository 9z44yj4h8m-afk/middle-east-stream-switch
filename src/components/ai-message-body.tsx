import { Link } from "@tanstack/react-router";
import { ArrowUpLeft } from "lucide-react";
import type { ReactNode } from "react";

const INLINE_RE = /(\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|`([^`]+)`)/g;

function safeHref(url: string): { internal: boolean; href: string } | null {
  if (url.startsWith("/") && !url.startsWith("//")) return { internal: true, href: url };
  if (url.startsWith("https://") || url.startsWith("http://")) return { internal: false, href: url };
  return null;
}

function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let idx = 0;
  for (const m of text.matchAll(INLINE_RE)) {
    const start = m.index ?? 0;
    if (start > last) out.push(text.slice(last, start));
    const [, , linkLabel, linkUrl, bold, code] = m;
    if (linkLabel && linkUrl) {
      const target = safeHref(linkUrl);
      if (target?.internal) {
        out.push(
          <Link key={idx++} to={target.href} className="almoghani-ai-link">
            <span>{linkLabel}</span>
            <ArrowUpLeft aria-hidden="true" />
          </Link>,
        );
      } else if (target) {
        out.push(
          <a key={idx++} href={target.href} target="_blank" rel="noopener noreferrer" className="almoghani-ai-link">
            <span>{linkLabel}</span>
            <ArrowUpLeft aria-hidden="true" />
          </a>,
        );
      } else {
        out.push(linkLabel);
      }
    } else if (bold) {
      out.push(<strong key={idx++}>{bold}</strong>);
    } else if (code) {
      out.push(<code key={idx++} className="almoghani-ai-code-inline">{code}</code>);
    }
    last = start + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function AiMessageBody({ content }: { content: string }) {
  const segments = content.split(/```(?:[a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g);
  const nodes: ReactNode[] = [];

  segments.forEach((seg, sIdx) => {
    if (sIdx % 2 === 1) {
      nodes.push(
        <pre key={`code-${sIdx}`} dir="ltr" className="almoghani-ai-code-block">
          <code>{seg.trim()}</code>
        </pre>,
      );
      return;
    }

    const lines = seg.split("\n");
    let listItems: string[] = [];
    let ordered = false;
    const flushList = (key: string) => {
      if (!listItems.length) return;
      const Tag = ordered ? "ol" : "ul";
      nodes.push(
        <Tag key={key} className="almoghani-ai-list">
          {listItems.map((item, i) => <li key={i}>{renderInline(item)}</li>)}
        </Tag>,
      );
      listItems = [];
    };

    lines.forEach((rawLine, lIdx) => {
      const line = rawLine.trim();
      if (!line) { flushList(`list-${sIdx}-${lIdx}`); return; }
      const ulMatch = /^[-*•]\s+(.+)$/.exec(line);
      const olMatch = /^\d+[.)]\s+(.+)$/.exec(line);
      if (ulMatch?.[1]) {
        if (listItems.length && ordered) flushList(`list-sw-${sIdx}-${lIdx}`);
        ordered = false;
        listItems.push(ulMatch[1]);
        return;
      }
      if (olMatch?.[1]) {
        if (listItems.length && !ordered) flushList(`list-sw-${sIdx}-${lIdx}`);
        ordered = true;
        listItems.push(olMatch[1]);
        return;
      }
      flushList(`list-${sIdx}-${lIdx}`);
      const hMatch = /^#{1,3}\s+(.+)$/.exec(line);
      if (hMatch?.[1]) {
        nodes.push(<h3 key={`h-${sIdx}-${lIdx}`} className="almoghani-ai-h">{renderInline(hMatch[1])}</h3>);
      } else {
        nodes.push(<p key={`p-${sIdx}-${lIdx}`}>{renderInline(line)}</p>);
      }
    });
    flushList(`list-end-${sIdx}`);
  });

  return <div className="almoghani-ai-prose">{nodes}</div>;
}