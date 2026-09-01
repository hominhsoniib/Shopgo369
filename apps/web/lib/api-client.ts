/**
 * API Client dùng chung — gọi tới NestJS backend (Mục 5.6 spec).
 * Phase 1: chỉ cần fetch cơ bản; React Query sẽ wrap ở tầng hooks sau.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Lỗi không xác định' }));
    const msg = Array.isArray(errorData.message)
      ? errorData.message.join(', ')
      : typeof errorData.message === 'string'
      ? errorData.message
      : typeof errorData.error === 'string'
      ? errorData.error
      : `API error: ${res.status}`;
    throw new Error(msg);
  }

  return res.json();
}
