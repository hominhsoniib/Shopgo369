export interface SampleProduct {
  id: string;
  slug: string;
  name: string;
  description: string;
  basePrice: string;
  images: { url: string }[];
  inventory: { quantityOnHand: number; reservedQuantity: number } | null;
  store: {
    id: string;
    name: string;
    slug: string;
    business?: {
      id: string;
      businessName: string;
    };
  };
}

export const SAMPLE_PRODUCTS: SampleProduct[] = [
  {
    id: 'prod-gao-st25',
    slug: 'gao-st25-thuong-hang-5kg',
    name: 'Gạo ST25 Thượng Hạng (Túi 5kg)',
    description: 'Gạo ST25 ngon nhất thế giới, hạt dài, dẻo thơm tự nhiên, đạt chuẩn VietGAP sản xuất tại An Giang.',
    basePrice: '180000',
    images: [{ url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop' }],
    inventory: { quantityOnHand: 200, reservedQuantity: 0 },
    store: {
      id: 'store-an-giang',
      name: 'Nông Sản An Giang',
      slug: 'nong-san-an-giang',
      business: { id: 'biz-an-giang', businessName: 'HKD Hợp Tác Xã Lúa Vàng An Giang' },
    },
  },
  {
    id: 'prod-tra-oolong',
    slug: 'tra-oolong-bao-loc-200g',
    name: 'Trà Oolong Bảo Lộc Thượng Hạng (Hộp 200g)',
    description: 'Trà Oolong hái tay từ cao nguyên Bảo Lộc Lâm Đồng, hương thơm dịu nhẹ, hậu vị ngọt thanh chuẩn xuất khẩu.',
    basePrice: '250000',
    images: [{ url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop' }],
    inventory: { quantityOnHand: 150, reservedQuantity: 0 },
    store: {
      id: 'store-lam-dong',
      name: 'Trà Oolong Lâm Đồng',
      slug: 'tra-oolong-lam-dong',
      business: { id: 'biz-lam-dong', businessName: 'HKD Trà Oolong Cao Nguyên Lâm Đồng' },
    },
  },
  {
    id: 'prod-mat-ong',
    slug: 'mat-ong-rung-nguyen-chat-500ml',
    name: 'Mật Ong Rừng Nguyên Chất (Chai 500ml)',
    description: 'Mật ong hoa rừng tự nhiên 100% nguyên chất từ cánh rừng Gia Lai, bổ dưỡng, thơm đặc trưng.',
    basePrice: '320000',
    images: [{ url: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=600&auto=format&fit=crop' }],
    inventory: { quantityOnHand: 80, reservedQuantity: 0 },
    store: {
      id: 'store-gia-lai',
      name: 'Mật Ong Gia Lai',
      slug: 'mat-ong-gia-lai',
      business: { id: 'biz-gia-lai', businessName: 'HKD Mật Ong & Phấn Hoa Gia Lai' },
    },
  },
  {
    id: 'prod-nam-linh-chi',
    slug: 'nam-linh-chi-do-cat-lat-250g',
    name: 'Nấm Linh Chi Đỏ Cắt Lát (Túi 250g)',
    description: 'Nấm linh chi đỏ nuôi trồng hữu cơ tại Tây Nguyên, giúp thanh lọc cơ thể và tăng cường sức đề kháng.',
    basePrice: '450000',
    images: [{ url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop' }],
    inventory: { quantityOnHand: 50, reservedQuantity: 0 },
    store: {
      id: 'store-tay-nguyen',
      name: 'Nông Sản Tây Nguyên',
      slug: 'nong-san-tay-nguyen',
      business: { id: 'biz-tay-nguyen', businessName: 'HKD Nông Sản Tây Nguyên Hữu Cơ' },
    },
  },
  {
    id: 'prod-ca-phe',
    slug: 'ca-phe-arabica-cau-dat-500g',
    name: 'Cà Phê Arabica Cầu Đất Đà Lạt (Túi 500g)',
    description: 'Hạt cà phê Arabica rang xay nguyên chất từ độ cao 1.600m Cầu Đất, vị chua thanh hương hoa trái tự nhiên.',
    basePrice: '210000',
    images: [{ url: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&auto=format&fit=crop' }],
    inventory: { quantityOnHand: 120, reservedQuantity: 0 },
    store: {
      id: 'store-lam-dong',
      name: 'Trà Oolong Lâm Đồng',
      slug: 'tra-oolong-lam-dong',
      business: { id: 'biz-lam-dong', businessName: 'HKD Trà Oolong Cao Nguyên Lâm Đồng' },
    },
  },
  {
    id: 'prod-hat-dieu',
    slug: 'hat-dieu-rang-muoi-binh-phuoc-500g',
    name: 'Hạt Điều Rang Muối Bình Phước (Hũ 500g)',
    description: 'Hạt điều vỏ lụa loại A1 nguyên hạt rang muối giòn rụm, béo bùi thơm ngon đặc sản Bình Phước.',
    basePrice: '175000',
    images: [{ url: 'https://images.unsplash.com/photo-1509358271058-acd02cc93898?w=600&auto=format&fit=crop' }],
    inventory: { quantityOnHand: 220, reservedQuantity: 0 },
    store: {
      id: 'store-binh-phuoc',
      name: 'Hạt Điều Bình Phước',
      slug: 'hat-dieu-binh-phuoc',
      business: { id: 'biz-binh-phuoc', businessName: 'HKD Hạt Điều & Nông Sản Bình Phước' },
    },
  },
  {
    id: 'prod-yen-sao',
    slug: 'yen-sao-khanh-hoa-chung-duong-phen-6-hu',
    name: 'Yến Sào Khánh Hòa Chưng Đường Phèn (Hộp 6 hũ)',
    description: 'Yến sào đảo thiên nhiên Khánh Hòa nguyên chất 18%, chưng đường phèn thanh mát bổ dưỡng sức khỏe.',
    basePrice: '690000',
    images: [{ url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop' }],
    inventory: { quantityOnHand: 60, reservedQuantity: 0 },
    store: {
      id: 'store-khanh-hoa',
      name: 'Yến Sào Khánh Hòa',
      slug: 'yen-sao-khanh-hoa',
      business: { id: 'biz-khanh-hoa', businessName: 'HKD Yến Sào & Đặc Sản Khánh Hòa' },
    },
  },
  {
    id: 'prod-tra-shan-tuyet',
    slug: 'tra-shan-tuyet-co-thu-ha-giang-100g',
    name: 'Trà Shan Tuyết Cổ Thụ Hà Giang (Hộp 100g)',
    description: 'Trà búp phủ tuyết trắng từ cây trà cổ thụ hàng trăm năm tuổi đỉnh núi Tây Côn Lĩnh Hà Giang.',
    basePrice: '380000',
    images: [{ url: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=600&auto=format&fit=crop' }],
    inventory: { quantityOnHand: 75, reservedQuantity: 0 },
    store: {
      id: 'store-tay-bac',
      name: 'Dược Liệu Tây Bắc',
      slug: 'duoc-lieu-tay-bac',
      business: { id: 'biz-tay-bac', businessName: 'HKD Dược Liệu Hữu Cơ Tây Bắc' },
    },
  },
  {
    id: 'prod-nuoc-mam',
    slug: 'nuoc-mam-nhi-phu-quoc-40-do-dam-500ml',
    name: 'Nước Mắm Nhĩ Phú Quốc 40 Độ Đạm (Chai 500ml)',
    description: 'Nước mắm nhĩ cá cơm ủ thùng gỗ truyền thống 12 tháng, hương vị đậm đà màu cánh gián thơm phức.',
    basePrice: '185000',
    images: [{ url: 'https://images.unsplash.com/photo-1472476443507-c7a5948772fc?w=600&auto=format&fit=crop' }],
    inventory: { quantityOnHand: 140, reservedQuantity: 0 },
    store: {
      id: 'store-369',
      name: 'Nông Sản Hợp Tác Xã 369',
      slug: 'nong-san-369',
      business: { id: 'biz-369', businessName: 'HKD Nông Sản Hợp Tác Xã 369' },
    },
  },
  {
    id: 'prod-dong-trung',
    slug: 'dong-trung-ha-thao-say-thang-hoa-10g',
    name: 'Đông Trùng Hạ Thảo Sấy Thăng Hoa (Hộp 10g)',
    description: 'Đông trùng hạ thảo Cordyceps militaris sấy thăng hoa giữ trọn 99% dưỡng chất và màu vàng tươi tự nhiên.',
    basePrice: '890000',
    images: [{ url: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=600&auto=format&fit=crop' }],
    inventory: { quantityOnHand: 40, reservedQuantity: 0 },
    store: {
      id: 'store-369',
      name: 'Nông Sản Hợp Tác Xã 369',
      slug: 'nong-san-369',
      business: { id: 'biz-369', businessName: 'HKD Nông Sản Hợp Tác Xã 369' },
    },
  },
];
