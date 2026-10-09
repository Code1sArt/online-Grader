import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProblemMarkdown } from '../src/components/ProblemMarkdown';

describe('problem Markdown', () => {
  it('renders pipe tables with column alignment and inline formatting', () => {
    render(
      <ProblemMarkdown>{`| ตัวแปร | ความหมาย | ค่า |
| :--- | :---: | ---: |
| **N** | จำนวนข้อมูล | \`100\` |
| A \\| B | ตัวเลือก | 2 |`}</ProblemMarkdown>,
    );

    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('columnheader')).toHaveLength(3);
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    expect(within(table).getByRole('columnheader', { name: 'ความหมาย' })).toHaveAttribute(
      'style',
      'text-align: center;',
    );
    expect(within(table).getByRole('cell', { name: '100' })).toHaveAttribute('style', 'text-align: right;');
    expect(within(table).getByText('N').tagName).toBe('STRONG');
    expect(within(table).getByText('100').tagName).toBe('CODE');
    expect(within(table).getByRole('cell', { name: 'A | B' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'ตาราง' })).toHaveAttribute('tabindex', '0');
  });
});
