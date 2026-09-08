import { Injectable, Logger } from '@nestjs/common';
import { DevicePlatform } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationQueueService } from './notification-queue.service';
import { NOTIFICATION_PREFERENCE_GROUP, NotificationTemplateCode } from './notification.constants';

/** Thay `{{key}}` trong template bằng giá trị tương ứng trong `variables` */
function renderTemplate(template: string, variables: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => String(variables[key] ?? ''));
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: NotificationQueueService,
  ) {}

  // ============================================================
  // GỌI TỪ CÁC MODULE NGHIỆP VỤ KHÁC (Orders, Refund, Commission, Points)
  // ============================================================

  /**
   * notify — điểm vào DUY NHẤT để bất kỳ module nào kích hoạt 1 thông báo.
   * KHÔNG BAO GIỜ throw ra ngoài — lỗi thông báo không được phép làm fail
   * luồng nghiệp vụ chính (đặt hàng, duyệt refund...) đang gọi nó. Lỗi được
   * log lại và ghi nhận trong NotificationLog.status = FAILED.
   */
  async notify(
    userId: string,
    templateCode: NotificationTemplateCode,
    variables: Record<string, string | number> = {},
    data?: Record<string, string>,
  ): Promise<void> {
    try {
      const template = await this.prisma.notificationTemplate.findUnique({ where: { code: templateCode } });
      if (!template || !template.isActive) {
        this.logger.warn(`Bỏ qua notify: template "${templateCode}" không tồn tại hoặc đang tắt`);
        return;
      }

      const allowed = await this.isChannelAllowed(userId, templateCode);
      const title = renderTemplate(template.titleTemplate, variables);
      const body = renderTemplate(template.bodyTemplate, variables);

      const log = await this.prisma.notificationLog.create({
        data: {
          userId,
          templateCode,
          channel: template.channel,
          title,
          body,
          data: data as any,
          status: allowed ? 'PENDING' : 'SKIPPED',
        },
      });

      if (!allowed) return; // vẫn lưu vào inbox lịch sử, chỉ không đẩy job gửi push
      await this.queue.enqueueSend(log.id);
    } catch (err) {
      // Cố tình nuốt lỗi ở lớp ngoài cùng này — xem docstring phía trên.
      this.logger.error(`notify("${templateCode}", user=${userId}) thất bại: ${(err as Error).message}`);
    }
  }

  private async isChannelAllowed(userId: string, templateCode: NotificationTemplateCode): Promise<boolean> {
    const group = NOTIFICATION_PREFERENCE_GROUP[templateCode];
    if (!group) return true;
    const pref = await this.prisma.notificationPreference.findUnique({ where: { userId } });
    if (!pref) return true; // chưa tạo preference row → mặc định BẬT hết (Mục default true trên schema)
    return pref[group];
  }

  // ============================================================
  // DEVICE TOKEN — mobile app đăng ký/huỷ đăng ký (login/logout)
  // ============================================================

  async registerDeviceToken(userId: string, token: string, platform: DevicePlatform) {
    return this.prisma.deviceToken.upsert({
      where: { token },
      // Cùng 1 token vật lý có thể trước đó gắn với user khác (thiết bị dùng
      // chung/đổi tài khoản) — upsert theo token đảm bảo luôn trỏ đúng user
      // hiện tại đang đăng nhập, tránh gửi nhầm thông báo sang người cũ.
      update: { userId, platform, lastUsedAt: new Date() },
      create: { userId, token, platform },
    });
  }

  async unregisterDeviceToken(userId: string, token: string) {
    await this.prisma.deviceToken.deleteMany({ where: { userId, token } });
  }

  // ============================================================
  // IN-APP INBOX — GET /notifications
  // ============================================================

  async getMyNotifications(userId: string, page = 1, pageSize = 20) {
    const [items, unreadCount, total] = await this.prisma.$transaction([
      this.prisma.notificationLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.notificationLog.count({ where: { userId, isRead: false } }),
      this.prisma.notificationLog.count({ where: { userId } }),
    ]);
    return { items, unreadCount, total, page, pageSize };
  }

  async markAsRead(userId: string, logId: string) {
    await this.prisma.notificationLog.updateMany({
      where: { id: logId, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notificationLog.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  // ============================================================
  // PREFERENCES — GET/PATCH /notifications/preferences
  // ============================================================

  async getPreferences(userId: string) {
    const pref = await this.prisma.notificationPreference.findUnique({ where: { userId } });
    // Trả về mặc định (tất cả BẬT) nếu user chưa từng đổi — khớp @default(true) trên schema
    return pref ?? { userId, orderUpdates: true, promotions: true, commission: true, learning: true };
  }

  async updatePreferences(
    userId: string,
    input: Partial<{ orderUpdates: boolean; promotions: boolean; commission: boolean; learning: boolean }>,
  ) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      update: input,
      create: {
        userId,
        orderUpdates: input.orderUpdates ?? true,
        promotions: input.promotions ?? true,
        commission: input.commission ?? true,
        learning: input.learning ?? true,
      },
    });
  }
}
