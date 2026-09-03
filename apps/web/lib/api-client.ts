/**
 * API Client dùng chung — gọi tới NestJS backend (Mục 5.6 spec).
 * Phase 1: chỉ cần fetch cơ bản; React Query sẽ wrap ở tầng hooks sau.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

let isRefreshing = false;

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const isPublicAuthRoute = path.startsWith('/auth/login') || path.startsWith('/auth/register') || path.startsWith('/auth/refresh');
  const token = !isPublicAuthRoute && typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  let res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  // Tự động thử làm mới token (Auto-Refresh) nếu nhận lỗi 401 Unauthorized
  if (res.status === 401 && !isPublicAuthRoute && !isRefreshing && typeof window !== 'undefined') {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      isRefreshing = true;
      try {
        const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          if (refreshData.accessToken) {
            localStorage.setItem('accessToken', refreshData.accessToken);
            if (refreshData.refreshToken) {
              localStorage.setItem('refreshToken', refreshData.refreshToken);
            }
            isRefreshing = false;

            // Thử lại request ban đầu với token mới
            return apiFetch<T>(path, options);
          }
        }
      } catch {
        // Bỏ qua lỗi refresh và chuyển xuống xử lý 401 bên dưới
      } finally {
        isRefreshing = false;
      }
    }

    // Xóa auth nếu token đã hết hạn hoàn toàn
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');

    throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại tài khoản Admin (Mật khẩu mặc định: ChangeMe@369).');
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Lỗi không xác định' }));

    const nested = errorData?.message?.message;
    const msg = Array.isArray(nested)
      ? nested.join(', ')
      : Array.isArray(errorData.message)
      ? errorData.message.join(', ')
      : typeof errorData.message === 'string'
      ? errorData.message
      : typeof errorData.message?.error === 'string'
      ? errorData.message.error
      : typeof errorData.error === 'string'
      ? errorData.error
      : res.status === 401
      ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
      : `API error: ${res.status}`;
    throw new Error(msg);
  }

  return res.json();
}

