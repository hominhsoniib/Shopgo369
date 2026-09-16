/**
 * Auth helper dùng chung — CHỈ dùng trong Client Component ('use client').
 *
 * Token thật (access/refresh) KHÔNG còn lưu ở đây — đã chuyển sang cookie
 * httpOnly do backend đặt (apps/api/src/modules/identity/auth/auth-cookie.util.ts),
 * JS phía client không đọc/ghi được nữa (chống đánh cắp token qua XSS).
 * localStorage giờ chỉ lưu thông tin user KHÔNG nhạy cảm (id/email/tên/role)
 * để UI hiển thị/redirect ngay lập tức mà không cần gọi API — việc phân
 * quyền THẬT vẫn luôn được enforce ở server qua cookie, dữ liệu ở đây chỉ
 * mang tính hiển thị, không phải nguồn xác thực.
 */
import { apiFetch } from './api-client';
import { peekGuestCartId, clearGuestCartId } from './guest-cart';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  twoFactorEnabled?: boolean;
}

const USER_KEY = 'user';

export function saveAuth(user: AuthUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getCurrentUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return !!localStorage.getItem(USER_KEY);
}

/** Chỉ xoá cache user cục bộ — KHÔNG gọi API, KHÔNG xoá cookie phía server.
 * Dùng khi biết chắc phiên đã/sắp vô hiệu (vd. refresh token hết hạn). */
export function clearAuth() {
  localStorage.removeItem(USER_KEY);
}

/** Đăng xuất thật — gọi API xoá cookie httpOnly phía server rồi mới xoá
 * cache user cục bộ. clearAuth() một mình KHÔNG đủ để đăng xuất vì cookie
 * httpOnly vẫn còn hiệu lực tới khi hết hạn tự nhiên nếu không gọi API này. */
export async function logout() {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } catch {
    // Vẫn xoá cache cục bộ dù API lỗi (mất mạng...) — không để người dùng kẹt
    // ở trạng thái "tưởng đã đăng xuất" nhưng UI vẫn hiện đã đăng nhập.
  }
  clearAuth();
}

/**
 * Gộp giỏ hàng guest (nếu khách có thêm sản phẩm TRƯỚC khi đăng nhập) vào
 * giỏ hàng của tài khoản vừa đăng nhập/đăng ký — gọi ngay sau saveAuth(),
 * TRƯỚC khi điều hướng đi trang khác (xem POST /cart/merge, CartService.
 * mergeGuestCartIntoUser). Không throw nếu lỗi (mất mạng, không có giỏ
 * guest...) — việc merge cart phụ không được phép chặn luồng đăng nhập
 * chính; im lặng bỏ qua và vẫn xoá guestCartId cũ để không kẹt lại lần sau.
 */
export async function mergeGuestCartOnLogin() {
  const sessionId = peekGuestCartId();
  if (!sessionId) return;
  try {
    await apiFetch('/cart/merge', { method: 'POST', body: JSON.stringify({ sessionId }) });
  } catch {
    // Bỏ qua — ví dụ giỏ guest đã trống/không tồn tại, hoặc lỗi mạng tạm thời.
  } finally {
    clearGuestCartId();
  }
}
