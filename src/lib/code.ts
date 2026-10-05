import type { Language } from '../types';

export const codeTemplates: Record<Language, string> = {
  CPP: '#include <iostream>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n\n    // เขียนโค้ดของคุณที่นี่\n\n    return 0;\n}\n',
  PYTHON: '# เขียนโค้ดของคุณที่นี่\ndef solve():\n    pass\n\n\nif __name__ == "__main__":\n    solve()\n',
};
