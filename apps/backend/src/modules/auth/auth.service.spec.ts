import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../../database/prisma.service';

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOrCreateUser', () => {
    it('既存ユーザーをDBから返す', async () => {
      const mockUser = {
        id: 'user-1',
        auth0UserId: 'auth0|123',
        email: 'test@example.com',
        organizationId: 'org-1',
        roles: [{ role: { name: 'worker' } }],
      };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getOrCreateUser('auth0|123', 'test@example.com');

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { auth0UserId: 'auth0|123' },
        include: { roles: { include: { role: true } } },
      });
      expect(result).toEqual(mockUser);
    });

    it('ユーザーが存在しない場合はUnauthorizedExceptionをスローする', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getOrCreateUser('auth0|new', 'new@example.com')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('enrichUser', () => {
    it('ユーザーにロール情報を付与する', async () => {
      const mockUser = {
        id: 'user-1',
        auth0UserId: 'auth0|123',
        email: 'test@example.com',
        organizationId: 'org-1',
        roles: [{ role: { name: 'supervisor' } }],
      };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const authenticatedUser = {
        auth0UserId: 'auth0|123',
        email: 'test@example.com',
        userId: '',
        roles: [],
        permissions: [],
        scope: '',
      };

      const result = await service.enrichUser(authenticatedUser);

      expect(result.userId).toBe('user-1');
      expect(result.organizationId).toBe('org-1');
      expect(result.roles).toEqual(['supervisor']);
    });
  });

  describe('validatePermissions', () => {
    it('必要なロールを持つ場合はtrueを返す', async () => {
      const mockUser = {
        id: 'user-1',
        isActive: true,
        roles: [{ role: { name: 'supervisor' } }],
      };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.validatePermissions('user-1', ['read:projects']);

      expect(result).toBe(true);
    });

    it('必要なロールを持たない場合はfalseを返す', async () => {
      const mockUser = {
        id: 'user-1',
        isActive: true,
        roles: [{ role: { name: 'viewer' } }],
      };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.validatePermissions('user-1', ['write:users']);

      expect(result).toBe(false);
    });

    it('system_adminはすべての権限を持つ', async () => {
      const mockUser = {
        id: 'user-1',
        isActive: true,
        roles: [{ role: { name: 'system_admin' } }],
      };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.validatePermissions('user-1', ['write:users', 'read:organizations']);

      expect(result).toBe(true);
    });

    it('ユーザーが存在しない場合はfalseを返す', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.validatePermissions('nonexistent', ['read:projects']);

      expect(result).toBe(false);
    });

    it('非アクティブユーザーはfalseを返す', async () => {
      const mockUser = {
        id: 'user-1',
        isActive: false,
        roles: [{ role: { name: 'supervisor' } }],
      };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.validatePermissions('user-1', ['read:projects']);

      expect(result).toBe(false);
    });
  });
});
