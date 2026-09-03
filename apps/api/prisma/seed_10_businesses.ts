import { PrismaClient, RoleName, BusinessStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const sampleBusinesses = [
  {
    email: 'seller.taynguyen@369.vn',
    fullName: 'Nguyễn Văn Hùng',
    businessName: 'HKD Nông Sản Tây Nguyên Hữu Cơ',
    taxCode: '0108849201',
    ownerIdCard: '038092001823',
    address: 'Số 128 Nguyễn Tất Thành, TP. Buôn Ma Thuột, Đắk Lắk',
    status: BusinessStatus.VERIFIED,
    storeName: 'Nông Sản Tây Nguyên',
    storeSlug: 'nong-san-tay-nguyen',
  },
  {
    email: 'seller.taybac@369.vn',
    fullName: 'Trần Thị Mai',
    businessName: 'HKD Dược Liệu Hữu Cơ Tây Bắc',
    taxCode: '0109923812',
    ownerIdCard: '012089004821',
    address: 'Thị xã Sa Pa, Tỉnh Lào Cai',
    status: BusinessStatus.VERIFIED,
    storeName: 'Dược Liệu Tây Bắc',
    storeSlug: 'duoc-lieu-tay-bac',
  },
  {
    email: 'seller.gialai@369.vn',
    fullName: 'Lê Hoàng Nam',
    businessName: 'HKD Mật Ong & Phấn Hoa Gia Lai',
    taxCode: '5901129482',
    ownerIdCard: '064091002381',
    address: 'Phường Hội Thương, TP. Pleiku, Gia Lai',
    status: BusinessStatus.PENDING_VERIFICATION,
  },
  {
    email: 'seller.lamdong@369.vn',
    fullName: 'Phạm Văn Tuấn',
    businessName: 'HKD Trà Oolong Cao Nguyên Lâm Đồng',
    taxCode: '5801293841',
    ownerIdCard: '068093001923',
    address: 'Phường 2, TP. Bảo Lộc, Lâm Đồng',
    status: BusinessStatus.VERIFIED,
    storeName: 'Trà Oolong Lâm Đồng',
    storeSlug: 'tra-oolong-lam-dong',
  },
  {
    email: 'seller.camau@369.vn',
    fullName: 'Võ Thị Hồng',
    businessName: 'HKD Thủy Hải Sản Sạch Cà Mau',
    taxCode: '6100928374',
    ownerIdCard: '096090005721',
    address: 'Phường 8, TP. Cà Mau, Tỉnh Cà Mau',
    status: BusinessStatus.PENDING_VERIFICATION,
  },
  {
    email: 'seller.angiang@369.vn',
    fullName: 'Đặng Minh Trí',
    businessName: 'HKD Hợp Tác Xã Lúa Vàng An Giang',
    taxCode: '8901239845',
    ownerIdCard: '089094002819',
    address: 'Xã Mỹ Hòa Hưng, TP. Long Xuyên, An Giang',
    status: BusinessStatus.VERIFIED,
    storeName: 'Nông Sản An Giang',
    storeSlug: 'nong-san-an-giang',
  },
  {
    email: 'seller.bentre@369.vn',
    fullName: 'Ngô Thanh Hương',
    businessName: 'HKD Đặc Sản Dừa & Bánh Kẹo Bến Tre',
    taxCode: '8301928341',
    ownerIdCard: '083092003712',
    address: 'Phường Phú Khương, TP. Bến Tre, Bến Tre',
    status: BusinessStatus.PENDING_VERIFICATION,
  },
  {
    email: 'seller.daknong@369.vn',
    fullName: 'Đỗ Quốc Bảo',
    businessName: 'HKD Nông Sản Tiêu Đen Đắk Nông',
    taxCode: '6701928371',
    ownerIdCard: '067091004812',
    address: 'Phường Nghĩa Tân, TP. Gia Nghĩa, Đắk Nông',
    status: BusinessStatus.DRAFT,
  },
  {
    email: 'seller.binhphuoc@369.vn',
    fullName: 'Bùi Thị Lan',
    businessName: 'HKD Hạt Điều & Nông Sản Bình Phước',
    taxCode: '7001928394',
    ownerIdCard: '070093002918',
    address: 'Phường Tân Phú, TP. Đồng Xoài, Bình Phước',
    status: BusinessStatus.VERIFIED,
    storeName: 'Hạt Điều Bình Phước',
    storeSlug: 'hat-dieu-binh-phuoc',
  },
  {
    email: 'seller.khanhhoa@369.vn',
    fullName: 'Dương Văn Tiến',
    businessName: 'HKD Yến Sào & Đặc Sản Khánh Hòa',
    taxCode: '5601928395',
    ownerIdCard: '056092001948',
    address: 'Phường Lộc Thọ, TP. Nha Trang, Khánh Hòa',
    status: BusinessStatus.PENDING_VERIFICATION,
  },
];

async function main() {
  console.log('🚀 Seeding 10 Hộ Kinh Doanh mẫu...');

  const customerRole = await prisma.role.findUniqueOrThrow({ where: { name: RoleName.CUSTOMER } });
  const sellerRole = await prisma.role.findUniqueOrThrow({ where: { name: RoleName.SELLER } });
  const defaultPasswordHash = await argon2.hash('SellerMe@369');

  let count = 0;
  for (const item of sampleBusinesses) {
    count++;
    const user = await prisma.user.upsert({
      where: { email: item.email },
      update: { fullName: item.fullName },
      create: {
        email: item.email,
        fullName: item.fullName,
        passwordHash: defaultPasswordHash,
        roles: {
          create: [{ roleId: customerRole.id }, { roleId: sellerRole.id }],
        },
      },
    });

    const member = await prisma.member.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        memberCode: `369-0000${10 + count}`,
        status: 'APPROVED',
      },
    });

    const business = await prisma.business.upsert({
      where: { memberId: member.id },
      update: {
        businessName: item.businessName,
        taxCode: item.taxCode,
        ownerIdCard: item.ownerIdCard,
        address: item.address,
        status: item.status,
      },
      create: {
        memberId: member.id,
        businessName: item.businessName,
        taxCode: item.taxCode,
        ownerIdCard: item.ownerIdCard,
        address: item.address,
        status: item.status,
      },
    });

    if (item.storeName && item.storeSlug) {
      await prisma.store.upsert({
        where: { businessId: business.id },
        update: { name: item.storeName },
        create: {
          businessId: business.id,
          name: item.storeName,
          slug: item.storeSlug,
          description: `Gian hàng chính hãng phân phối ${item.businessName}`,
          status: 'ACTIVE',
        },
      });
    }

    console.log(`  ✅ [${count}/10] ${item.businessName} (${item.status})`);
  }

  console.log('✨ Đã tạo thành công 10 Hộ Kinh Doanh mẫu vào CSDL!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi seed 10 Hộ Kinh Doanh:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
