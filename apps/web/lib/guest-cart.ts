/**
 * Guest cart identity — khách CHƯA đăng nhập vẫn dùng được giỏ hàng thật
 * (xem apps/api CartController: OptionalJwtAuthGuard + header
 * X-Guest-Cart-Id). FE tự sinh 1 UUID, lưu localStorage, gửi kèm mọi
 * request /cart khi chưa có cookie đăng nhập (xem lib/api-client.ts).
 * Khi đăng nhập, id này được gộp vào giỏ hàng user thật rồi xoá
 * (xem mergeGuestCartOnLogin() trong lib/auth-client.ts).
 */
const GUEST_CART_ID_KEY = 'guestCartId';

/** Lấy id giỏ hàng guest — tự sinh mới nếu chưa có. Dùng khi THỰC SỰ cần
 * gửi kèm request (api-client.ts gọi hàm này cho mọi request /cart). */
export function getGuestCartId(): string {
  let id = localStorage.getItem(GUEST_CART_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(GUEST_CART_ID_KEY, id);
  }
  return id;
}

/** Đọc id hiện có, KHÔNG tự sinh mới — dùng để kiểm tra "có giỏ hàng guest
 * nào cần gộp không" mà không tạo ra 1 giỏ hàng guest rỗng vô nghĩa. */
export function peekGuestCartId(): string | null {
  return localStorage.getItem(GUEST_CART_ID_KEY);
}

export function clearGuestCartId() {
  localStorage.removeItem(GUEST_CART_ID_KEY);
}
