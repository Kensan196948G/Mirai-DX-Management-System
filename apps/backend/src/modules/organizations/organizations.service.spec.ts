import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { PrismaService } from '../../database/prisma.service';

const mockPrismaService = {
  organization: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
};

const mockOrganization = {
  id: 'org-1',
  name: 'Test Organization',
  type: 'HEADQUARTERS' as any,
  code: 'ORG-001',
  parentId: null,
  address: 'Tokyo',
  tel: '03-1234-5678',
  isActive: true,
  parent: null,
  children: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('OrganizationsService', () => {
  let service: OrganizationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('正常に組織を作成する', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(null);
      mockPrismaService.organization.create.mockResolvedValue(mockOrganization);

      const dto = {
        name: 'Test Organization',
        type: 'HEADQUARTERS' as any,
        code: 'ORG-001',
      };

      const result = await service.create(dto);

      expect(mockPrismaService.organization.create).toHaveBeenCalled();
      expect(result).toEqual(mockOrganization);
    });

    it('コード重複でConflictExceptionをスローする', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrganization);

      const dto = {
        name: 'Duplicate Org',
        type: 'BRANCH' as any,
        code: 'ORG-001',
      };

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('codeなしでも作成できる（自動生成）', async () => {
      mockPrismaService.organization.create.mockResolvedValue({
        ...mockOrganization,
        code: `ORG-${Date.now()}`,
      });

      const dto = {
        name: 'No Code Org',
        type: 'BRANCH' as any,
      };

      const result = await service.create(dto);

      expect(mockPrismaService.organization.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('組織一覧を返す', async () => {
      mockPrismaService.organization.findMany.mockResolvedValue([mockOrganization]);

      const result = await service.findAll();

      expect(mockPrismaService.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { parent: true, children: true },
        }),
      );
      expect(result).toEqual([mockOrganization]);
    });
  });

  describe('findOne', () => {
    it('存在するIDで組織を返す', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrganization);

      const result = await service.findOne('org-1');

      expect(mockPrismaService.organization.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'org-1' } }),
      );
      expect(result).toEqual(mockOrganization);
    });

    it('存在しないIDでNotFoundExceptionをスローする', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
