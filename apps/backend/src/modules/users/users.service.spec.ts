import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../../database/prisma.service';

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  userRole: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  role: {
    findMany: jest.fn(),
  },
};

const mockUser = {
  id: 'user-1',
  auth0UserId: 'auth0|123',
  email: 'test@example.com',
  name: 'Test User',
  organizationId: 'org-1',
  isActive: true,
  employeeCode: 'EMP001',
  roles: [],
  organization: { id: 'org-1', name: 'Test Org' },
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('正常にユーザーを作成する', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      const dto = {
        auth0UserId: 'auth0|123',
        email: 'test@example.com',
        name: 'Test User',
        organizationId: 'org-1',
        roles: [] as any[],
      };

      const result = await service.create(dto);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { auth0UserId: dto.auth0UserId },
      });
      expect(mockPrismaService.user.create).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('既存ユーザーのauth0UserIdでConflictExceptionをスローする', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const dto = {
        auth0UserId: 'auth0|123',
        email: 'test@example.com',
        name: 'Test User',
        organizationId: 'org-1',
        roles: [] as any[],
      };

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('ユーザー一覧を返す', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([mockUser]);

      const result = await service.findAll();

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined }),
      );
      expect(result).toEqual([mockUser]);
    });

    it('organizationIdフィルター付きで一覧を返す', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([mockUser]);

      const result = await service.findAll('org-1');

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId: 'org-1' } }),
      );
      expect(result).toEqual([mockUser]);
    });
  });

  describe('findOne', () => {
    it('存在するIDでユーザーを返す', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne('user-1');

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        include: { roles: true, organization: true },
      });
      expect(result).toEqual(mockUser);
    });

    it('存在しないIDでNotFoundExceptionをスローする', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('正常にユーザーを更新する', async () => {
      const updatedUser = { ...mockUser, name: 'Updated Name' };
      // findOne is called twice: once to verify existence, once to return final result
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(updatedUser);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.update('user-1', { name: 'Updated Name' });

      expect(mockPrismaService.user.update).toHaveBeenCalled();
      expect(result).toEqual(updatedUser);
    });
  });

  describe('remove', () => {
    it('ユーザーを非アクティブ化（ソフトデリート）する', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      const deactivatedUser = { ...mockUser, isActive: false };
      mockPrismaService.user.update.mockResolvedValue(deactivatedUser);

      const result = await service.remove('user-1');

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { isActive: false },
        include: { roles: true, organization: true },
      });
      expect(result.isActive).toBe(false);
    });
  });
});
