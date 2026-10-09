import { describe, expect, it, vi } from 'vitest';
import Swal from 'sweetalert2';
import { api, json, tokenStore } from '../src/lib/api';
import { competitionPhase } from '../src/pages/Competitions';
import { competition } from './fixtures';
describe('API and competition boundaries', () => {
  it('does not send a mutation when the confirmation is cancelled', async () => {
    vi.mocked(Swal.fire).mockResolvedValueOnce({ isConfirmed: false, isDenied: false, isDismissed: true });
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    await expect(api('/submissions/admin/problems/p1/reset', json('POST', {}))).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('attaches the JWT and clears it on an expired session', async () => {
    tokenStore.set('expired');
    const expired = vi.fn();
    window.addEventListener('nr-session-expired', expired);
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 }));
    vi.stubGlobal('fetch', fetcher);
    await expect(api('/problems', json('POST', {}))).rejects.toMatchObject({ status: 401 });
    expect(fetcher.mock.calls[0][1].headers.get('Authorization')).toBe('Bearer expired');
    expect(tokenStore.get()).toBeNull();
    expect(expired).toHaveBeenCalledOnce();
    window.removeEventListener('nr-session-expired', expired);
  });
  it('translates network errors into a readable failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(api('/problems')).rejects.toThrow('เชื่อมต่อระบบไม่ได้');
  });
  it('handles the exact start and end of competitions', () => {
    const start = new Date(competition.startsAt).getTime();
    const end = new Date(competition.endsAt).getTime();
    expect(competitionPhase(competition, start - 1)).toBe('เร็ว ๆ นี้');
    expect(competitionPhase(competition, start)).toBe('กำลังแข่งขัน');
    expect(competitionPhase(competition, end)).toBe('สิ้นสุดแล้ว');
    expect(competitionPhase({ ...competition, status: 'DRAFT' }, start)).toBe('ฉบับร่าง');
  });
});
