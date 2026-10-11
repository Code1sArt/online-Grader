import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import Swal from 'sweetalert2';
import { AdminProblemEditor } from '../src/pages/AdminProblems';
import type { Problem } from '../src/types';
import { problem } from './fixtures';

let current: Problem;
let failure: string;
let writes: { id: string; method: string; body?: string }[];
beforeEach(() => {
  current = {
    ...problem,
    status: 'DRAFT',
    scoringEditable: true,
    subtasks: [{ id: 'g1', name: 'กลุ่มหนึ่ง', score: 100, position: 1, description: '' }],
    testCases: [1, 2, 3].map((n) => ({
      ...problem.testCases![0],
      id: `t${n}`,
      name: `เทส ${n}`,
      position: n,
    })),
  };
  writes = [];
  failure = '';
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, options: RequestInit = {}) => {
      if (options.method === 'PATCH' || options.method === 'DELETE') {
        const id = url.split('/').pop()!;
        writes.push({ id, method: options.method, body: options.body as string });
        if (id === failure)
          return new Response(JSON.stringify({ message: 'บันทึกไม่สำเร็จ' }), { status: 500 });
        if (options.method === 'DELETE')
          current.testCases = current.testCases!.filter((test) => test.id !== id);
        else
          current.testCases = current.testCases!.map((test) =>
            test.id === id ? { ...test, ...JSON.parse(options.body as string) } : test,
          );
        return new Response('{}');
      }
      return new Response(JSON.stringify(current));
    }),
  );
});
function mount() {
  render(
    <MemoryRouter initialEntries={['/admin/problems/p1']}>
      <Routes>
        <Route path="/admin/problems/:id" element={<AdminProblemEditor />} />
      </Routes>
    </MemoryRouter>,
  );
}
it('automatically saves a subtask and can return to individual scoring without confirmation', async () => {
  mount();
  await userEvent.selectOptions(await screen.findByLabelText('Subtask ของ เทส 1'), 'g1');
  await waitFor(() => expect(screen.getByLabelText('Subtask ของ เทส 1')).toBeEnabled());
  expect(JSON.parse(writes[0].body!)).toEqual({ subtaskId: 'g1', score: 0 });
  await userEvent.selectOptions(screen.getByLabelText('Subtask ของ เทส 1'), '');
  await waitFor(() => expect(writes).toHaveLength(2));
  expect(JSON.parse(writes[1].body!)).toEqual({ subtaskId: '', score: 0 });
  expect(Swal.fire).not.toHaveBeenCalled();
});
it('restores the saved subtask and shows errors when autosaving fails', async () => {
  failure = 't1';
  mount();
  await userEvent.selectOptions(await screen.findByLabelText('Subtask ของ เทส 1'), 'g1');
  expect(await screen.findByText('บันทึกไม่สำเร็จ')).toBeInTheDocument();
  expect(screen.getByLabelText('Subtask ของ เทส 1')).toHaveValue('');
});
it('deletes only selected tests with one confirmation', async () => {
  mount();
  await userEvent.click(await screen.findByLabelText('เลือกเทส เทส 1'));
  await userEvent.click(screen.getByLabelText('เลือกเทส เทส 3'));
  await userEvent.click(screen.getByRole('button', { name: 'ลบที่เลือก' }));
  await waitFor(() => expect(screen.queryByLabelText('เลือกเทส เทส 3')).not.toBeInTheDocument());
  expect(writes.map((write) => write.id)).toEqual(['t1', 't3']);
  expect(screen.getByLabelText('เลือกเทส เทส 2')).toBeInTheDocument();
  expect(Swal.fire).toHaveBeenCalledTimes(1);
});
it('can cancel deleting everything and then delete all tests', async () => {
  mount();
  const button = await screen.findByRole('button', { name: 'ลบทั้งหมด' });
  vi.mocked(Swal.fire).mockResolvedValueOnce({ isConfirmed: false, isDenied: false, isDismissed: true });
  await userEvent.click(button);
  expect(writes).toHaveLength(0);
  await userEvent.click(button);
  expect(await screen.findByText('ยังไม่มีเทสเคส เพิ่มคู่ไฟล์ด้านล่างเพื่อเริ่มต้น')).toBeInTheDocument();
  expect(writes).toHaveLength(3);
});
it('refreshes completed deletions and retains failed selections after a partial failure', async () => {
  failure = 't2';
  mount();
  await userEvent.click(await screen.findByLabelText('เลือกเทสทั้งหมด'));
  await userEvent.click(screen.getByRole('button', { name: 'ลบที่เลือก' }));
  expect(await screen.findByText('ลบแล้ว 1 / 3 รายการ: บันทึกไม่สำเร็จ')).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByLabelText('เลือกเทส เทส 1')).not.toBeInTheDocument());
  expect(screen.getByLabelText('เลือกเทส เทส 2')).toBeChecked();
  expect(screen.getByLabelText('เลือกเทส เทส 3')).toBeChecked();
  expect(writes.map((write) => write.id)).toEqual(['t1', 't2']);
});
