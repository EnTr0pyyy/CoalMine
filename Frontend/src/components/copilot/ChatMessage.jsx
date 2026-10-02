import { useState } from 'react';
import { Bot, User, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const markdownComponents = {
  h1: ({ children }) => <h1 className="mb-3 mt-5 text-lg font-bold text-ink-900 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-2 mt-5 border-b border-border pb-1.5 text-base font-bold text-ink-900 first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-2 mt-4 text-sm font-bold text-ink-900 first:mt-0">{children}</h3>,
  p: ({ children }) => <p className="my-2 leading-7 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-6 marker:text-brand-600">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-6 marker:font-semibold marker:text-brand-700">{children}</ol>,
  li: ({ children }) => <li className="pl-1 leading-6">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-4 border-status-info bg-status-infoBg/50 py-2 pl-3 pr-2 text-ink-700">
      {children}
    </blockquote>
  ),
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="font-medium text-brand-700 underline decoration-brand-600/40 underline-offset-2 hover:text-brand-900">
      {children}
    </a>
  ),
  hr: () => <hr className="my-4 border-border" />,
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded border border-border">
      <table className="w-full border-collapse text-left text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-surface-sunken text-ink-900">{children}</thead>,
  th: ({ children }) => <th className="border-b border-border px-3 py-2 font-semibold">{children}</th>,
  td: ({ children }) => <td className="border-b border-border px-3 py-2 align-top last:border-b-0">{children}</td>,
  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto rounded-md bg-[#101b25] p-3 text-xs leading-6 text-[#e8eef4]">{children}</pre>
  ),
  code: ({ children, className }) => {
    const isBlock = Boolean(className) || String(children).includes('\n');
    return (
      <code className={isBlock ? 'font-mono' : 'rounded bg-surface-sunken px-1.5 py-0.5 font-mono text-[0.9em] text-brand-900'}>
        {children}
      </code>
    );
  },
};

export default function ChatMessage({ message }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  function handleCopy() {
    navigator.clipboard?.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isUser ? 'bg-brand-100 text-brand-800' : 'bg-surface-sunken text-brand-700'
        }`}
      >
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </span>
      <div className={`${isUser ? 'max-w-[75%] items-end' : 'w-full max-w-4xl items-start'} flex min-w-0 flex-col`}>
        <div className={`min-w-0 max-w-full rounded-md px-4 py-3 text-sm ${isUser ? 'whitespace-pre-wrap break-words bg-brand-800 text-white' : 'border border-border border-l-4 border-l-brand-600 bg-surface-card text-ink-900 shadow-sm'}`}>
          {isUser ? (
            message.content
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {message.content || ''}
            </ReactMarkdown>
          )}
        </div>
        {!isUser && (
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <button onClick={handleCopy} className="flex items-center gap-1 text-xs text-ink-500 hover:text-ink-900">
              {copied ? <Check size={11} /> : <Copy size={11} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            {message.sources?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {message.sources.map((s) => (
                  <span key={s} className="rounded-sm bg-surface-sunken px-1.5 py-0.5 font-mono text-[10px] text-ink-500">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
