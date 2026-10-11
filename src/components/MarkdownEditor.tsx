import { useId, useRef, useState, type KeyboardEvent } from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading2,
  List,
  ListOrdered,
  Code,
  Quote,
  Link,
  Table2,
  Eye,
  Pencil,
} from 'lucide-react';
import { ProblemMarkdown } from './ProblemMarkdown';

type Props = {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  rows?: number;
  required?: boolean;
};

export function MarkdownEditor({ label, name, defaultValue = '', placeholder, rows = 6, required }: Props) {
  const id = useId();
  const input = useRef<HTMLTextAreaElement>(null);
  const selection = useRef({ start: 0, end: 0 });
  const [value, setValue] = useState(defaultValue);
  const [preview, setPreview] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const [tableRows, setTableRows] = useState(2);
  const [tableColumns, setTableColumns] = useState(2);

  function rememberSelection() {
    if (input.current)
      selection.current = { start: input.current.selectionStart, end: input.current.selectionEnd };
  }

  function replace(start: number, end: number, text: string, selectStart: number, selectEnd: number) {
    setValue(value.slice(0, start) + text + value.slice(end));
    selection.current = { start: selectStart, end: selectEnd };
    requestAnimationFrame(() => {
      input.current?.focus();
      input.current?.setSelectionRange(selectStart, selectEnd);
    });
  }

  function wrap(before: string, after = before, fallback = 'ข้อความ') {
    rememberSelection();
    const { start, end } = selection.current;
    const text = value.slice(start, end) || fallback;
    // Clicking the same format again removes its markers around the selection.
    if (
      start >= before.length &&
      value.slice(start - before.length, start) === before &&
      value.slice(end, end + after.length) === after
    ) {
      replace(
        start - before.length,
        end + after.length,
        text,
        start - before.length,
        start - before.length + text.length,
      );
    } else {
      replace(start, end, before + text + after, start + before.length, start + before.length + text.length);
    }
  }

  function prefixLines(prefix: (index: number) => string) {
    rememberSelection();
    const { start, end } = selection.current;
    const from = start === 0 ? 0 : value.lastIndexOf('\n', start - 1) + 1;
    const lastSelected = end > start && value[end - 1] === '\n' ? end - 1 : end;
    const nextLine = value.indexOf('\n', lastSelected);
    const to = nextLine < 0 ? value.length : nextLine;
    const text = (value.slice(from, to) || 'ข้อความ')
      .split('\n')
      .map((line, index) => prefix(index) + line)
      .join('\n');
    replace(from, to, text, from, from + text.length);
  }

  function insertBlock(text: string) {
    rememberSelection();
    const { start, end } = selection.current;
    const before =
      start > 0
        ? value.slice(0, start).endsWith('\n\n')
          ? ''
          : value[start - 1] === '\n'
            ? '\n'
            : '\n\n'
        : '';
    const after =
      end < value.length
        ? value.slice(end).startsWith('\n\n')
          ? ''
          : value[end] === '\n'
            ? '\n'
            : '\n\n'
        : '\n';
    replace(start, end, before + text + after, start + before.length, start + before.length + text.length);
  }

  function insertTable() {
    const row = (cells: string[]) => `| ${cells.join(' | ')} |`;
    const headers = row(Array.from({ length: tableColumns }, (_, index) => `หัวข้อ ${index + 1}`));
    const separator = row(Array(tableColumns).fill('---'));
    const body = Array.from({ length: tableRows }, () => row(Array(tableColumns).fill('ข้อมูล')));
    insertBlock([headers, separator, ...body].join('\n'));
    setTableOpen(false);
  }

  function shortcuts(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === 'b' || key === 'i') {
      event.preventDefault();
      rememberSelection();
      wrap(key === 'b' ? '**' : '*');
    }
  }

  const tools = [
    { label: 'ตัวหนา', Icon: Bold, action: () => wrap('**') },
    { label: 'ตัวเอียง', Icon: Italic, action: () => wrap('*') },
    { label: 'ขีดฆ่า', Icon: Strikethrough, action: () => wrap('~~') },
    { label: 'หัวข้อ', Icon: Heading2, action: () => prefixLines(() => '## ') },
    { label: 'รายการหัวข้อย่อย', Icon: List, action: () => prefixLines(() => '- ') },
    { label: 'รายการลำดับเลข', Icon: ListOrdered, action: () => prefixLines((index) => `${index + 1}. `) },
    { label: 'โค้ด', Icon: Code, action: () => wrap('`', '`', 'code') },
    { label: 'ข้อความอ้างอิง', Icon: Quote, action: () => prefixLines(() => '> ') },
    { label: 'แทรกลิงก์', Icon: Link, action: () => wrap('[', '](https://example.com)', 'ข้อความลิงก์') },
  ];

  return (
    <div className="field markdown-editor-field">
      <label htmlFor={id}>{label}</label>
      <div className="markdown-editor">
        <div className="markdown-editor-toolbar" role="group" aria-label="เครื่องมือจัดรูปแบบข้อความ">
          {tools.map(({ label: toolLabel, Icon, action }) => (
            <button
              key={toolLabel}
              type="button"
              title={toolLabel}
              aria-label={toolLabel}
              disabled={preview}
              onMouseDown={(event) => event.preventDefault()}
              onClick={action}
            >
              <Icon size={17} />
            </button>
          ))}
          <button
            type="button"
            title="แทรกตาราง"
            aria-label="แทรกตาราง"
            aria-expanded={tableOpen}
            aria-controls={`${id}-table`}
            disabled={preview}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setTableOpen(!tableOpen)}
          >
            <Table2 size={17} />
          </button>
          <button
            type="button"
            className="markdown-editor-preview-toggle"
            aria-pressed={preview}
            onClick={() => {
              setPreview(!preview);
              setTableOpen(false);
            }}
          >
            {preview ? <Pencil size={16} /> : <Eye size={16} />}
            {preview ? 'แก้ไขข้อความ' : 'ดูตัวอย่าง'}
          </button>
        </div>
        {tableOpen && (
          <div
            id={`${id}-table`}
            className="markdown-editor-table-options"
            role="group"
            aria-label="ขนาดตาราง"
          >
            <label>
              คอลัมน์
              <select
                aria-label="คอลัมน์"
                value={tableColumns}
                onChange={(event) => setTableColumns(Number(event.target.value))}
              >
                {[1, 2, 3, 4, 5, 6].map((count) => (
                  <option key={count}>{count}</option>
                ))}
              </select>
            </label>
            <label>
              แถวข้อมูล
              <select
                aria-label="แถวข้อมูล"
                value={tableRows}
                onChange={(event) => setTableRows(Number(event.target.value))}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((count) => (
                  <option key={count}>{count}</option>
                ))}
              </select>
            </label>
            <button type="button" className="button secondary small" onClick={insertTable}>
              เพิ่มตาราง
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setTableOpen(false);
                input.current?.focus();
              }}
            >
              ยกเลิก
            </button>
          </div>
        )}
        <textarea
          ref={input}
          id={id}
          name={name}
          value={value}
          required={required}
          rows={rows}
          placeholder={placeholder}
          aria-describedby={`${id}-hint`}
          tabIndex={preview ? -1 : undefined}
          className={preview ? 'markdown-editor-source-hidden' : undefined}
          onChange={(event) => setValue(event.target.value)}
          onSelect={rememberSelection}
          onKeyDown={shortcuts}
          onInvalid={() => setPreview(false)}
        />
        {preview && (
          <div className="markdown markdown-editor-preview" role="region" aria-label="ตัวอย่างข้อความ">
            {value.trim() ? (
              <ProblemMarkdown>{value}</ProblemMarkdown>
            ) : (
              <p className="muted">ยังไม่มีข้อความให้แสดงตัวอย่าง</p>
            )}
          </div>
        )}
      </div>
      <small id={`${id}-hint`}>
        เลือกข้อความแล้วใช้เครื่องมือจัดรูปแบบ · Ctrl/Cmd + B ตัวหนา · Ctrl/Cmd + I ตัวเอียง · บันทึกเป็น
        Markdown
      </small>
    </div>
  );
}
