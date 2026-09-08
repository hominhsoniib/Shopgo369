/**
 * NOTIFICATION_QUEUE — tên queue BullMQ dùng chung Redis broker, theo đúng
 * pattern producer/worker đã có ở Phase 2 (Mục 3.1, 9.2 spec — xem
 * `orders/queue.service.ts` + `orders/processors/order-timeout.processor.ts`).
 * Gửi push LUÔN đi qua queue (không await trực tiếp trong request path) để
 * 1 lần gửi push chậm/lỗi (Firebase down, token hết hạn...) không bao giờ
 * làm chậm hoặc làm fail luồng nghiệp vụ chính (checkout, duyệt refund...).
 */
export const NOTIFICATION_QUEUE = 'notification-send';

/**
 * PUSH_PROVIDER — DI token cho PushProviderAdapter đang active (Fcm hoặc Noop).
 * Đặt ở đây (KHÔNG đặt trong notification.module.ts) để tránh circular import:
 * cả `notification.module.ts` (nơi khai báo factory provider) lẫn
 * `processors/notification.processor.ts` (nơi @Inject(PUSH_PROVIDER)) đều
 * import từ file constants trung lập này thay vì import lẫn nhau.
 */
export const PUSH_PROVIDER = 'PUSH_PROVIDER';

/** Mã template — mỗi mã ứng với 1 sự kiện nghiệp vụ cụ thể (Mục 4.1, 4.3 spec) */
export enum NotificationTemplateCode {
  ORDER_PAID = 'ORDER_PAID',
  ORDER_CONFIRMED = 'ORDER_CONFIRMED',
  ORDER_SHIPPING = 'ORDER_SHIPPING',
  ORDER_COMPLETED = 'ORDER_COMPLETED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  REFUND_APPROVED = 'REFUND_APPROVED',
  REFUND_REJECTED = 'REFUND_REJECTED',
  COMMISSION_APPROVED = 'COMMISSION_APPROVED',
  POINTS_EARNED = 'POINTS_EARNED',
  MEMBER_LEVEL_UP = 'MEMBER_LEVEL_UP',
}

/** Nhóm preference (4 cột trên NotificationPreference) mà mỗi template thuộc về.
 * Không có preference riêng cho từng loại đơn hàng — người dùng chỉ cần bật/tắt
 * theo NHÓM lớn (đơn giản hoá UX, đúng tinh thần MVP của dự án). */
export const NOTIFICATION_PREFERENCE_GROUP: Record<
  NotificationTemplateCode,
  'orderUpdates' | 'promotions' | 'commission' | 'learning'
> = {
  [NotificationTemplateCode.ORDER_PAID]: 'orderUpdates',
  [NotificationTemplateCode.ORDER_CONFIRMED]: 'orderUpdates',
  [NotificationTemplateCode.ORDER_SHIPPING]: 'orderUpdates',
  [NotificationTemplateCode.ORDER_COMPLETED]: 'orderUpdates',
  [NotificationTemplateCode.ORDER_CANCELLED]: 'orderUpdates',
  [NotificationTemplateCode.REFUND_APPROVED]: 'orderUpdates',
  [NotificationTemplateCode.REFUND_REJECTED]: 'orderUpdates',
  [NotificationTemplateCode.COMMISSION_APPROVED]: 'commission',
  [NotificationTemplateCode.POINTS_EARNED]: 'commission',
  [NotificationTemplateCode.MEMBER_LEVEL_UP]: 'commission',
};
