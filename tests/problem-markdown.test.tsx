import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProblemMarkdown } from '../src/components/ProblemMarkdown';

describe('problem Markdown', () => {
  it('renders superscript and subscript in prose and tables with inline Markdown', () => {
    const { container } = render(
      <ProblemMarkdown>{`n<sup>2</sup> + A<sub>**i**</sub>

| สูตร |
| --- |
| 10<sup>9</sup> |`}</ProblemMarkdown>,
    );
    expect([...container.querySelectorAll('sup')].map((node) => node.textContent)).toEqual(['2', '9']);
    expect(container.querySelector('sub strong')).toHaveTextContent('i');
    expect(within(screen.getByRole('table')).getByRole('cell')).toHaveTextContent('109');
  });

  it('preserves literal code and ignores unsafe HTML and mismatched tags', () => {
    const { container } = render(
      <ProblemMarkdown>
        {
          '`n<sup>2</sup>` and A<sub>i</sup> and <sup onclick="alert(1)">x</sup> and <img src="x" onerror="alert(1)"> <script>alert(1)</script>'
        }
      </ProblemMarkdown>,
    );
    expect(container.querySelector('code')).toHaveTextContent('n<sup>2</sup>');
    expect(container.querySelector('sup, sub, img, script, [onclick], [onerror]')).toBeNull();
    expect(container).toHaveTextContent('A<sub>i</sup>');
  });

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
