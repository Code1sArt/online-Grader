import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { remarkSupSub } from '../lib/remarkSupSub';

export function ProblemMarkdown({ children }: { children: string }) {
  return (
    <Markdown
      remarkPlugins={[remarkGfm, remarkSupSub]}
      components={{
        table: ({ children }) => (
          <div className="markdown-table-scroll" role="region" aria-label="ตาราง" tabIndex={0}>
            <table>{children}</table>
          </div>
        ),
      }}
    >
      {children}
    </Markdown>
  );
}
