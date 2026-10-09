import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import Swal from 'sweetalert2';
vi.mock('sweetalert2', () => ({ default: { fire: vi.fn() } }));
import { afterEach, beforeEach, vi } from 'vitest';
beforeEach(() => {
  vi.mocked(Swal.fire)
    .mockReset()
    .mockResolvedValue({ isConfirmed: true, isDenied: false, isDismissed: false });
  sessionStorage.clear();
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
