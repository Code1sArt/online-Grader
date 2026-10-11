import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MarkdownEditor } from '../src/components/MarkdownEditor';

function select(input: HTMLTextAreaElement, start: number, end: number) {
  input.focus();
  input.setSelectionRange(start, end);
  fireEvent.select(input);
}

describe('Markdown editor', () => {
  it('formats only the selection, preserves surrounding text and toggles formatting', async () => {
    render(<MarkdownEditor label="เนื้อหาโจทย์" name="statement" defaultValue="ก่อน ข้อความ หลัง" />);
    const input = screen.getByRole('textbox', { name: 'เนื้อหาโจทย์' }) as HTMLTextAreaElement;
    select(input, 5, 12);
    await userEvent.click(screen.getByRole('button', { name: 'ตัวหนา', exact: true }));
    expect(input).toHaveValue('ก่อน **ข้อความ** หลัง');
    await waitFor(() => expect(input.selectionStart).toBe(7));
    await userEvent.click(screen.getByRole('button', { name: 'ตัวหนา', exact: true }));
    expect(input).toHaveValue('ก่อน ข้อความ หลัง');
    await waitFor(() => expect(input.selectionStart).toBe(5));
    fireEvent.keyDown(input, { key: 'i', ctrlKey: true });
    expect(input).toHaveValue('ก่อน *ข้อความ* หลัง');
  });

  it('adds a configurable table and submits the Markdown while previewing', async () => {
    const { container } = render(
      <form>
        <MarkdownEditor label="เนื้อหาโจทย์" name="statement" defaultValue="โจทย์เดิม" />
      </form>,
    );
    const input = screen.getByRole('textbox', { name: 'เนื้อหาโจทย์' }) as HTMLTextAreaElement;
    select(input, input.value.length, input.value.length);
    await userEvent.click(screen.getByRole('button', { name: 'แทรกตาราง' }));
    await userEvent.selectOptions(screen.getByLabelText('คอลัมน์'), '3');
    await userEvent.selectOptions(screen.getByLabelText('แถวข้อมูล'), '4');
    await userEvent.click(screen.getByRole('button', { name: 'เพิ่มตาราง', exact: true }));
    expect(input.value).toMatch(/^โจทย์เดิม\n\n\| หัวข้อ 1/);
    await userEvent.click(screen.getByRole('button', { name: 'ดูตัวอย่าง' }));
    expect(screen.getAllByRole('columnheader')).toHaveLength(3);
    expect(screen.getAllByRole('row')).toHaveLength(5);
    expect(new FormData(container.querySelector('form')!).get('statement')).toBe(input.value);
    await userEvent.click(screen.getByRole('button', { name: 'แก้ไขข้อความ' }));
    expect(input.value).toContain('โจทย์เดิม');
  });

  it('numbers selected lines without modifying adjacent paragraphs', async () => {
    render(<MarkdownEditor label="เนื้อหาโจทย์" name="statement" defaultValue={'ก่อน\nหนึ่ง\nสอง\nหลัง'} />);
    const input = screen.getByRole('textbox', { name: 'เนื้อหาโจทย์' }) as HTMLTextAreaElement;
    select(input, 5, 14);
    await userEvent.click(screen.getByRole('button', { name: 'รายการลำดับเลข' }));
    expect(input).toHaveValue('ก่อน\n1. หนึ่ง\n2. สอง\nหลัง');
  });

  it('returns to editing when a required empty field is invalid in preview', async () => {
    render(<MarkdownEditor label="เนื้อหาโจทย์" name="statement" required />);
    const input = screen.getByRole('textbox', { name: 'เนื้อหาโจทย์' });
    await userEvent.click(screen.getByRole('button', { name: 'ดูตัวอย่าง' }));
    fireEvent.invalid(input);
    expect(screen.getByRole('button', { name: 'ดูตัวอย่าง' })).toBeInTheDocument();
    expect(input).not.toHaveClass('markdown-editor-source-hidden');
  });
});
