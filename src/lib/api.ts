const base = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const key = 'nr-grader-session';
export const tokenStore = {
  get: () => sessionStorage.getItem(key),
  set: (token: string) => sessionStorage.setItem(key, token),
  clear: () => sessionStorage.removeItem(key),
};
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const token = tokenStore.get();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  let response: Response;
  const timeout = AbortSignal.timeout(20000);
  try {
    response = await fetch(`${base}${path}`, {
      ...options,
      headers,
      signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
    });
  } catch (e) {
    if (options.signal?.aborted) throw e;
    throw new ApiError('เชื่อมต่อระบบไม่ได้ กรุณาลองอีกครั้ง', 0);
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/google')) {
      tokenStore.clear();
      window.dispatchEvent(new Event('nr-session-expired'));
    }
    throw new ApiError(
      Array.isArray(data?.message) ? data.message.join(', ') : data?.message || 'ดำเนินการไม่สำเร็จ',
      response.status,
    );
  }
  return data as T;
}
export const json = (method: string, data: unknown): RequestInit => ({ method, body: JSON.stringify(data) });
export const message = (e: unknown) => (e instanceof Error ? e.message : 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง');
