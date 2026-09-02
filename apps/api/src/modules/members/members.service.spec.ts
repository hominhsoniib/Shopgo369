import { ConflictException, NotFoundException } from '@nestjs/common';
import { MembersService } from './members.service';

function makeMockPrisma() {
  return {
    member: {
      findUnique: jest.fn(),
      create: jest.fn((args: any) => ({ id: 'new-member-id', ...args.data })),
      count: jest.fn().mockResolvedValue(0),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  } as any;
}

describe('MembersService.registerMember — giới hạn hoa hồng 1 TẦNG DUY NHẤT (tuân thủ luật bán hàng đa cấp)', () => {
  let prisma: ReturnType<typeof makeMockPrisma>;
  let service: MembersService;

  beforeEach(() => {
    prisma = makeMockPrisma();
    service = new MembersService(prisma);
  });

  it('throw ConflictException nếu tài khoản đã là thành viên', async () => {
    prisma.member.findUnique.mockResolvedValue({ id: 'existing' });

    await expect(service.registerMember('user-1')).rejects.toThrow(
      ConflictException,
    );
    expect(prisma.member.create).not.toHaveBeenCalled();
  });

  it('throw NotFoundException nếu mã giới thiệu không tồn tại', async () => {
    prisma.member.findUnique
      .mockResolvedValueOnce(null) // check existing member của chính user
      .mockResolvedValueOnce(null); // tra cứu referrer theo memberCode

    await expect(
      service.registerMember('user-1', 'MA-KHONG-TON-TAI'),
    ).rejects.toThrow(NotFoundException);
  });

  it('không có referralCode: đăng ký thành công, referredById = undefined', async () => {
    prisma.member.findUnique.mockResolvedValueOnce(null); // chưa là member

    await service.registerMember('user-1');

    expect(prisma.member.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ referredById: undefined }),
      }),
    );
  });

  it('★ CỐT LÕI: referredById chỉ được gán = ID của referrer TRỰC TIẾP, KHÔNG truy ngược lên referredBy.referredBy — đảm bảo đúng 1 tầng', async () => {
    // referrer bản thân CŨNG có người giới thiệu (referredById: 'grandparent-id')
    // — đây chính là tình huống dễ gây bug leo 2 tầng nếu code vô tình đọc
    // referrer.referredById thay vì referrer.id.
    const referrer = {
      id: 'referrer-id',
      memberCode: '369-000001',
      referredById: 'grandparent-id',
    };
    prisma.member.findUnique
      .mockResolvedValueOnce(null) // user-2 chưa là member
      .mockResolvedValueOnce(referrer); // tra cứu bằng memberCode

    await service.registerMember('user-2', '369-000001');

    const createArg = prisma.member.create.mock.calls[0][0];
    expect(createArg.data.referredById).toBe('referrer-id'); // đúng tầng 1
    expect(createArg.data.referredById).not.toBe('grandparent-id'); // KHÔNG leo lên tầng 2

    // Chỉ được tra cứu member 1 lần cho existing-check + 1 lần cho referrer —
    // không có lần gọi thứ 3 nào để "truy ngược" referredBy của referrer.
    expect(prisma.member.findUnique).toHaveBeenCalledTimes(2);
  });

  it('sinh memberCode dạng 369-000NNN dựa trên count hiện tại', async () => {
    prisma.member.findUnique.mockResolvedValueOnce(null);
    prisma.member.count.mockResolvedValue(41);

    await service.registerMember('user-1');

    const createArg = prisma.member.create.mock.calls[0][0];
    expect(createArg.data.memberCode).toBe('369-000042');
  });
});
