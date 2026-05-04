"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownProps {
  text: string;
  compact?: boolean;
}

/**
 * 공용 markdown 렌더러 — V2 디자인 토큰만 사용.
 * **bold**, *italic*, ## 헤딩, | 표 |, - 리스트, > 인용, --- 구분선 모두 자연스럽게.
 * AI 응답 표시(review/chat/write/adapt) 공용.
 */
export function Markdown({ text, compact = false }: MarkdownProps) {
  return (
    <div className={"sm-md" + (compact ? " sm-md-compact" : "")}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
      <style jsx>{`
        .sm-md :global(h1) {
          font-size: ${compact ? "16px" : "20px"};
          font-weight: 700;
          color: var(--ink-1);
          margin: 16px 0 8px;
          padding-bottom: 4px;
          border-bottom: 1px solid var(--line);
        }
        .sm-md :global(h2) {
          font-size: ${compact ? "15px" : "17px"};
          font-weight: 700;
          color: var(--ink-1);
          margin: 16px 0 6px;
        }
        .sm-md :global(h3) {
          font-size: ${compact ? "14px" : "15px"};
          font-weight: 600;
          color: var(--ink-2);
          margin: 12px 0 4px;
        }
        .sm-md :global(h4),
        .sm-md :global(h5),
        .sm-md :global(h6) {
          font-size: 13px;
          font-weight: 600;
          color: var(--ink-2);
          margin: 10px 0 4px;
        }
        .sm-md :global(p) {
          font-size: ${compact ? "13px" : "13.5px"};
          line-height: 1.7;
          color: var(--ink-2);
          margin: 4px 0 8px;
        }
        .sm-md :global(strong) {
          font-weight: 700;
          color: var(--ink-1);
        }
        .sm-md :global(em) {
          font-style: italic;
          color: var(--ink-2);
        }
        .sm-md :global(ul),
        .sm-md :global(ol) {
          padding-left: 18px;
          margin: 4px 0 8px;
        }
        .sm-md :global(li) {
          font-size: ${compact ? "13px" : "13.5px"};
          line-height: 1.7;
          color: var(--ink-2);
          margin: 2px 0;
        }
        .sm-md :global(blockquote) {
          border-left: 3px solid var(--coral);
          padding: 4px 12px;
          margin: 8px 0;
          color: var(--ink-3);
          font-size: 13px;
          background: var(--card-soft);
          border-radius: 0 6px 6px 0;
        }
        .sm-md :global(hr) {
          border: 0;
          border-top: 1px solid var(--line);
          margin: 16px 0;
        }
        .sm-md :global(code) {
          font-family: Consolas, monospace;
          font-size: 12px;
          background: var(--card-soft);
          padding: 1px 5px;
          border-radius: 3px;
          color: var(--ink-2);
        }
        .sm-md :global(pre) {
          background: var(--card-soft);
          border: 1px solid var(--line);
          padding: 10px 12px;
          border-radius: 8px;
          overflow-x: auto;
          margin: 8px 0;
        }
        .sm-md :global(pre code) {
          background: transparent;
          padding: 0;
          font-size: 12px;
        }
        .sm-md :global(table) {
          border-collapse: collapse;
          width: 100%;
          margin: 8px 0;
          font-size: 12.5px;
        }
        .sm-md :global(th),
        .sm-md :global(td) {
          border: 1px solid var(--line);
          padding: 6px 10px;
          text-align: left;
          vertical-align: top;
        }
        .sm-md :global(th) {
          background: var(--card-soft);
          font-weight: 600;
          color: var(--ink-2);
        }
        .sm-md :global(td) {
          color: var(--ink-2);
        }
        .sm-md :global(a) {
          color: var(--coral);
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
