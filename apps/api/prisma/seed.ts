import { PrismaClient, RoleName } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

/**
 * Đọc email/mật khẩu tài khoản seed từ biến môi trường.
 *
 * BẢO MẬT: nếu NODE_ENV=production mà biến môi trường tương ứng chưa được
 * đặt, HÀM SẼ THROW — chặn cứng việc lỡ tay chạy `prisma db seed` trên
 * production và tạo ra tài khoản admin với mật khẩu mặc định đã công khai
 * trong README/mã nguồn (admin@369.vn / ChangeMe@369). Ở dev/staging vẫn
 * cho phép fallback về giá trị mặc định để tiện làm việc.
 */
function resolveSeedCredential(
  envVarName: string,
  devDefault: string,
  label: string,
): { value: string; isDefault: boolean } {
  const fromEnv = process.env[envVarName]?.trim();
  if (fromEnv) {
    return { value: fromEnv, isDefault: false };
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `[SEED] Thiếu biến môi trường ${envVarName} khi NODE_ENV=production. ` +
        `Không được seed tài khoản ${label} với giá trị mặc định (đã công khai trong ` +
        `mã nguồn/README) lên môi trường production. Đặt ${envVarName} trong .env ` +
        `(sinh giá trị mạnh, KHÔNG dùng "${devDefault}") rồi chạy lại seed.`,
    );
  }
  return { value: devDefault, isDefault: true };
}

async function main() {
  console.log('🌱 Seeding roles...');
  for (const name of Object.values(RoleName)) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log('🌱 Seeding member levels...');
  await prisma.memberLevel.upsert({
    where: { name: 'Thành viên' },
    update: {},
    create: { name: 'Thành viên', minPoints: 0 },
  });
  await prisma.memberLevel.upsert({
    where: { name: 'Bạc' },
    update: {},
    create: { name: 'Bạc', minPoints: 1000 },
  });
  await prisma.memberLevel.upsert({
    where: { name: 'Vàng' },
    update: {},
    create: { name: 'Vàng', minPoints: 5000 },
  });

  console.log('🌱 Seeding shipping methods...');
  await prisma.shippingMethod.upsert({
    where: { code: 'standard' },
    update: {},
    create: { code: 'standard', name: 'Giao hàng tiêu chuẩn', baseFee: 20000, estimatedDays: 3 },
  });
  await prisma.shippingMethod.upsert({
    where: { code: 'express' },
    update: {},
    create: { code: 'express', name: 'Giao hàng nhanh', baseFee: 35000, estimatedDays: 1 },
  });

  console.log('🌱 Seeding commission rule mặc định...');
  const existingRule = await prisma.commissionRule.findFirst({ where: { isActive: true } });
  if (!existingRule) {
    await prisma.commissionRule.create({
      data: { name: 'Hoa hồng giới thiệu mặc định', ratePercent: 5.0, isActive: true },
    });
  }

  console.log('🌱 Seeding tài khoản Super Admin mặc định...');
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: RoleName.SUPER_ADMIN } });
  const adminEmail = resolveSeedCredential('SEED_ADMIN_EMAIL', 'admin@369.vn', 'Super Admin');
  const adminPassword = resolveSeedCredential('SEED_ADMIN_PASSWORD', 'ChangeMe@369', 'Super Admin');
  const passwordHash = await argon2.hash(adminPassword.value);

  await prisma.user.upsert({
    where: { email: adminEmail.value },
    update: { passwordHash },
    create: {
      email: adminEmail.value,
      fullName: 'Super Admin 369',
      passwordHash,
      roles: { create: { roleId: adminRole.id } },
    },
  });

  console.log('🌱 Seeding gian hàng & sản phẩm mẫu...');
  const customerRole = await prisma.role.findUniqueOrThrow({ where: { name: RoleName.CUSTOMER } });
  const sellerRole = await prisma.role.findUniqueOrThrow({ where: { name: RoleName.SELLER } });

  // Tạo tài khoản Seller mẫu
  const sellerEmail = resolveSeedCredential('SEED_SELLER_EMAIL', 'seller@369.vn', 'Seller mẫu');
  const sellerPassword = resolveSeedCredential('SEED_SELLER_PASSWORD', 'SellerMe@369', 'Seller mẫu');
  const sellerPasswordHash = await argon2.hash(sellerPassword.value);
  const sellerUser = await prisma.user.upsert({
    where: { email: sellerEmail.value },
    update: { passwordHash: sellerPasswordHash },
    create: {
      email: sellerEmail.value,
      fullName: 'Hộ Kinh Doanh Nông Sản 369',
      passwordHash: sellerPasswordHash,
      roles: {
        create: [{ roleId: customerRole.id }, { roleId: sellerRole.id }],
      },
    },
  });

  // Tạo Member & Business & Store
  const sellerMember = await prisma.member.upsert({
    where: { userId: sellerUser.id },
    update: {},
    create: {
      userId: sellerUser.id,
      memberCode: '369-000001',
      status: 'APPROVED',
    },
  });

  const sellerBusiness = await prisma.business.upsert({
    where: { memberId: sellerMember.id },
    update: {},
    create: {
      memberId: sellerMember.id,
      businessName: 'HKD Nông Sản Hợp Tác Xã 369',
      taxCode: '0101234567',
      ownerIdCard: '001090000123',
      address: 'Số 369 Nguyễn Trãi, Thanh Xuân, Hà Nội',
      status: 'VERIFIED',
    },
  });

  const sellerStore = await prisma.store.upsert({
    where: { businessId: sellerBusiness.id },
    update: {},
    create: {
      businessId: sellerBusiness.id,
      slug: 'nong-san-369',
      name: 'Nông Sản Hợp Tác Xã 369',
      description: 'Chuyên phân phối nông sản, đặc sản vùng miền chính hãng chất lượng cao',
      status: 'ACTIVE',
    },
  });

  // Danh mục sản phẩm mẫu
  const catNongSan = await prisma.category.upsert({
    where: { slug: 'nong-san' },
    update: {},
    create: { slug: 'nong-san', name: 'Nông Sản Sạch' },
  });

  const catDacSan = await prisma.category.upsert({
    where: { slug: 'dac-san' },
    update: {},
    create: { slug: 'dac-san', name: 'Đặc Sản Vùng Miền' },
  });

  const catDuocLieu = await prisma.category.upsert({
    where: { slug: 'duoc-lieu-suc-khoe' },
    update: {},
    create: { slug: 'duoc-lieu-suc-khoe', name: 'Dược Liệu & Sức Khỏe' },
  });

  // Danh sách 12 Sản phẩm mẫu phong phú
  const sampleProducts = [
    {
      slug: 'gao-st25-thuong-hang-5kg',
      name: 'Gạo ST25 Thượng Hạng (Túi 5kg)',
      description: 'Gạo ST25 ngon nhất thế giới, hạt dài, dẻo thơm tự nhiên, đạt chuẩn VietGAP',
      basePrice: 180000,
      stock: 200,
      imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop',
      catId: catNongSan.id,
    },
    {
      slug: 'tra-oolong-bao-loc-200g',
      name: 'Trà Oolong Bảo Lộc Thượng Hạng (Hộp 200g)',
      description: 'Trà Oolong hái tay từ cao nguyên Bảo Lộc, hương thơm dịu nhẹ, hậu vị ngọt thanh',
      basePrice: 250000,
      stock: 150,
      imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop',
      catId: catDacSan.id,
    },
    {
      slug: 'mat-ong-rung-nguyen-chat-500ml',
      name: 'Mật Ong Rừng Nguyên Chất (Chai 500ml)',
      description: 'Mật ong hoa rừng tự nhiên 100%, bổ dưỡng, không pha tạp, bảo quản tự nhiên',
      basePrice: 320000,
      stock: 80,
      imageUrl: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=600&auto=format&fit=crop',
      catId: catDacSan.id,
    },
    {
      slug: 'nam-linh-chi-do-cat-lat-250g',
      name: 'Nấm Linh Chi Đỏ Cắt Lát (Túi 250g)',
      description: 'Nấm linh chi đỏ nuôi trồng hữu cơ, nâng cao sức đề kháng, tăng cường sức khỏe',
      basePrice: 450000,
      stock: 50,
      imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop',
      catId: catNongSan.id,
    },
    {
      slug: 'ca-phe-arabica-cau-dat-500g',
      name: 'Cà Phê Arabica Cầu Đất Đà Lạt (Túi 500g)',
      description: 'Hạt cà phê Arabica rang xay nguyên chất từ độ cao 1.600m Cầu Đất, vị chua thanh hương hoa trái',
      basePrice: 210000,
      stock: 120,
      imageUrl: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&auto=format&fit=crop',
      catId: catDacSan.id,
    },
    {
      slug: 'tieu-den-huu-co-phu-quoc-250g',
      name: 'Tiêu Đen Hữu Cơ Phú Quốc (Hũ 250g)',
      description: 'Tiêu đen hạt mẩy cay nồng đặc trưng đảo ngọc Phú Quốc, trồng hướng hữu cơ không hóa chất',
      basePrice: 135000,
      stock: 180,
      imageUrl: 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=600&auto=format&fit=crop',
      catId: catNongSan.id,
    },
    {
      slug: 'toi-den-ly-son-len-men-500g',
      name: 'Tỏi Đen Lý Sơn Lên Men Hữu Cơ (Túi 500g)',
      description: 'Tỏi cô đơn Lý Sơn lên men tự nhiên 60 ngày, dẻo ngọt ngào không cay nồng, giàu chất chống oxy hóa',
      basePrice: 390000,
      stock: 90,
      imageUrl: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop',
      catId: catDuocLieu.id,
    },
    {
      slug: 'hat-dieu-rang-muoi-binh-phuoc-500g',
      name: 'Hạt Điều Rang Muối Bình Phước (Hũ 500g)',
      description: 'Hạt điều vỏ lụa loại A nguyên hạt rang muối giòn rụm, béo bùi nguyên vị',
      basePrice: 175000,
      stock: 220,
      imageUrl: 'https://images.unsplash.com/photo-1509358271058-acd02cc93898?w=600&auto=format&fit=crop',
      catId: catDacSan.id,
    },
    {
      slug: 'yen-sao-khanh-hoa-chung-duong-phen-6-hu',
      name: 'Yến Sào Khánh Hòa Chưng Đường Phèn (Hộp 6 hũ)',
      description: 'Yến sào đảo thiên nhiên Khánh Hòa nguyên chất 18%, chưng đường phèn thanh mát bổ dưỡng',
      basePrice: 690000,
      stock: 60,
      imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop',
      catId: catDuocLieu.id,
    },
    {
      slug: 'tra-shan-tuyet-co-thu-ha-giang-100g',
      name: 'Trà Shan Tuyết Cổ Thụ Hà Giang (Hộp 100g)',
      description: 'Trà búp phủ tuyết trắng từ cây trà cổ thụ hàng trăm năm tuổi đỉnh Tây Côn Lĩnh',
      basePrice: 380000,
      stock: 75,
      imageUrl: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=600&auto=format&fit=crop',
      catId: catDacSan.id,
    },
    {
      slug: 'nuoc-mam-nhi-phu-quoc-40-do-dam-500ml',
      name: 'Nước Mắm Nhĩ Phú Quốc 40 Độ Đạm (Chai 500ml)',
      description: 'Nước mắm nhĩ cá cơm ủ thùng gỗ truyền thống 12 tháng, nước mắm đậm đà màu cánh gián',
      basePrice: 185000,
      stock: 140,
      imageUrl: 'https://images.unsplash.com/photo-1472476443507-c7a5948772fc?w=600&auto=format&fit=crop',
      catId: catDacSan.id,
    },
    {
      slug: 'dong-trung-ha-thao-say-thang-hoa-10g',
      name: 'Đông Trùng Hạ Thảo Sấy Thăng Hoa (Hộp 10g)',
      description: 'Đông trùng hạ thảo Cordyceps militaris sấy thăng hoa giữ trọn 99% dưỡng chất và màu vàng tươi',
      basePrice: 890000,
      stock: 40,
      imageUrl: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=600&auto=format&fit=crop',
      catId: catDuocLieu.id,
    },
  ];

  for (const p of sampleProducts) {
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: { status: 'ACTIVE', basePrice: p.basePrice },
      create: {
        storeId: sellerStore.id,
        slug: p.slug,
        name: p.name,
        description: p.description,
        basePrice: p.basePrice,
        status: 'ACTIVE',
        categories: { create: { categoryId: p.catId } },
        images: { create: { url: p.imageUrl, sortOrder: 0 } },
      },
    });

    await prisma.productInventory.upsert({
      where: { productId: product.id },
      update: { quantityOnHand: p.stock },
      create: { productId: product.id, quantityOnHand: p.stock, reservedQuantity: 0 },
    });
  }

  console.log('✅ Seed hoàn tất.');
  if (adminPassword.isDefault || sellerPassword.isDefault) {
    console.log(
      '⚠️  Đang dùng mật khẩu MẶC ĐỊNH cho dev (đã công khai trong README/mã nguồn) — ' +
        'CHỈ dùng cho local dev. Đặt SEED_ADMIN_PASSWORD / SEED_SELLER_PASSWORD trong .env ' +
        'trước khi seed lên staging/production.',
    );
    console.log(`   admin:  ${adminEmail.value} / ${adminPassword.isDefault ? adminPassword.value : '(đã đặt qua .env, không in ra)'}`);
    console.log(`   seller: ${sellerEmail.value} / ${sellerPassword.isDefault ? sellerPassword.value : '(đã đặt qua .env, không in ra)'}`);
  } else {
    console.log(`   admin:  ${adminEmail.value} (mật khẩu đã đặt qua .env, không in ra)`);
    console.log(`   seller: ${sellerEmail.value} (mật khẩu đã đặt qua .env, không in ra)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
