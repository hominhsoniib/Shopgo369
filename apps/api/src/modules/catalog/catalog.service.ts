import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductStatus } from '@prisma/client';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- CATEGORIES (Admin quản lý — Phase 1 đơn giản, phẳng) ----------

  listCategories() {
    return this.prisma.category.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } });
  }

  createCategory(name: string, parentId?: string) {
    return this.prisma.category.create({
      data: { name, slug: slugify(name), parentId },
    });
  }

  // ---------- PRODUCTS ----------

  /** Danh sách sản phẩm public — có filter cơ bản, phục vụ trang Shop (Mục 5.6 spec) */
  async listProducts(params: { categorySlug?: string; search?: string; page?: number; pageSize?: number }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;

    const where: any = { status: ProductStatus.ACTIVE, deletedAt: null };
    if (params.search) {
      where.name = { contains: params.search, mode: 'insensitive' };
    }
    if (params.categorySlug) {
      where.categories = { some: { category: { slug: params.categorySlug } } };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: { images: true, inventory: true, store: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  getBySlug(slug: string) {
    return this.prisma.product.findUnique({
      where: { slug },
      include: { images: true, inventory: true, store: true, categories: { include: { category: true } } },
    });
  }

  /** Seller tạo sản phẩm — chỉ được tạo cho store của CHÍNH MÌNH (Mục 7.2 spec) */
  async createProduct(userId: string, data: {
    name: string;
    description?: string;
    basePrice: number;
    categoryIds?: string[];
    initialQuantity?: number;
  }) {
    const store = await this.prisma.store.findFirst({ where: { business: { member: { userId } } } });
    if (!store) throw new NotFoundException('Bạn chưa có gian hàng, không thể đăng sản phẩm');

    const baseSlug = slugify(data.name);
    const slug = await this.ensureUniqueSlug(baseSlug);

    return this.prisma.product.create({
      data: {
        storeId: store.id,
        name: data.name,
        description: data.description,
        basePrice: data.basePrice,
        slug,
        status: ProductStatus.DRAFT,
        categories: data.categoryIds
          ? { create: data.categoryIds.map((categoryId) => ({ categoryId })) }
          : undefined,
        inventory: { create: { quantityOnHand: data.initialQuantity ?? 0 } },
      },
      include: { inventory: true },
    });
  }

  async publish(userId: string, productId: string) {
    await this.assertOwnership(userId, productId);
    return this.prisma.product.update({
      where: { id: productId },
      data: { status: ProductStatus.ACTIVE },
    });
  }

  /** Seller xem sản phẩm CỦA MÌNH — enforce ở query layer, không phải chỉ ở guard */
  async listOwnProducts(userId: string) {
    return this.prisma.product.findMany({
      where: { store: { business: { member: { userId } } }, deletedAt: null },
      include: { inventory: true, images: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async assertOwnership(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { store: { include: { business: { include: { member: true } } } } },
    });
    if (!product || product.store.business.member.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa sản phẩm này');
    }
    return product;
  }

  private async ensureUniqueSlug(base: string): Promise<string> {
    let slug = base;
    let i = 1;
    while (await this.prisma.product.findUnique({ where: { slug } })) {
      slug = `${base}-${i++}`;
    }
    return slug;
  }
}
