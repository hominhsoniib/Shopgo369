import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessStatus } from '@prisma/client';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // bỏ dấu tiếng Việt
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}

  /** Tạo gian hàng — bắt buộc business đã VERIFIED (không cho tạo store khi chưa xác thực KYC) */
  async createStore(userId: string, data: { name: string; description?: string }) {
    const business = await this.prisma.business.findFirst({
      where: { member: { userId } },
    });
    if (!business) {
      throw new NotFoundException('Bạn cần đăng ký hộ kinh doanh trước');
    }
    if (business.status !== BusinessStatus.VERIFIED) {
      throw new BadRequestException('Hộ kinh doanh chưa được xác thực (VERIFIED) — không thể mở gian hàng');
    }

    const existing = await this.prisma.store.findUnique({ where: { businessId: business.id } });
    if (existing) {
      throw new ConflictException('Hộ kinh doanh này đã có gian hàng');
    }

    const baseSlug = slugify(data.name);
    const slug = await this.ensureUniqueSlug(baseSlug);

    return this.prisma.store.create({
      data: {
        businessId: business.id,
        name: data.name,
        description: data.description,
        slug,
      },
    });
  }

  findBySlug(slug: string) {
    return this.prisma.store.findUnique({
      where: { slug },
      include: { products: { where: { deletedAt: null } } },
    });
  }

  /** Enforce "Seller chỉ thấy dữ liệu store của mình" — Mục 7.2 spec */
  async getOwnStore(userId: string) {
    const store = await this.prisma.store.findFirst({
      where: { business: { member: { userId } } },
    });
    if (!store) throw new NotFoundException('Bạn chưa có gian hàng');
    return store;
  }

  private async ensureUniqueSlug(base: string): Promise<string> {
    let slug = base;
    let i = 1;
    while (await this.prisma.store.findUnique({ where: { slug } })) {
      slug = `${base}-${i++}`;
    }
    return slug;
  }
}
