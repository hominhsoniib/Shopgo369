/**
 * API Client dùng chung — gọi tới NestJS backend (Mục 5.6 spec).
 *
 * Xác thực qua cookie httpOnly (access_token/refresh_token do backend đặt) —
 * KHÔNG còn tự đọc token từ localStorage/gắn header Authorization thủ công
 * như trước. `credentials: 'include'` bắt buộc trên MỌI request để trình
 * duyệt gửi kèm cookie (kể cả khi web và api khác domain/port).
 *
 * Riêng route /cart/* — backend hỗ trợ CẢ khách vãng lai (chưa đăng nhập)
 * qua header X-Guest-Cart-Id (xem apps/api CartController). Header này vẫn
 * gửi an toàn ngay cả khi đã đăng nhập — backend ưu tiên cookie/userId,
 * chỉ dùng header khi thật sự chưa đăng nhập (xem buildIdentity() backend).
 */
import { getGuestCartId } from './guest-cart';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

let isRefreshing = false;

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const isPublicAuthRoute = path.startsWith('/auth/login') || path.startsWith('/auth/register') || path.startsWith('/auth/refresh');
  const isCartRoute = path.startsWith('/cart');

  let res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(isCartRoute && typeof window !== 'undefined' ? { 'X-Guest-Cart-Id': getGuestCartId() } : {}),
      ...options?.headers,
    },
  });

  // Tự động thử làm mới token (Auto-Refresh) nếu nhận lỗi 401 Unauthorized —
  // refresh token đọc từ cookie httpOnly phía server, không cần gửi body.
  if (res.status === 401 && !isPublicAuthRoute && !isRefreshing) {
    isRefreshing = true;
    try {
      const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (refreshRes.ok) {
        isRefreshing = false;
        // Refresh thành công — cookie access_token mới đã được server set lại,
        // chỉ cần thử lại request ban đầu (không cần đọc/lưu token gì thủ công).
        return apiFetch<T>(path, options);
      }
    } catch {
      // Bỏ qua lỗi refresh và chuyển xuống xử lý 401 bên dưới
    } finally {
      isRefreshing = false;
    }

    // Refresh thất bại — phiên hết hạn hoàn toàn, xoá cache user cục bộ
    // (cookie đã hết hạn hoặc bị server từ chối, không cần gọi /auth/logout).
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
    }

    throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
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
