import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../../database/prisma.service';

const mockPrismaService = {
  project: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  photo: {
    aggregate: jest.fn(),
  },
  photoFolder: {
    count: jest.fn(),
  },
  $queryRaw: jest.fn(),
};

const mockProject = {
  id: 'project-1',
  name: 'Test Project',
  code: 'PRJ-001',
  organizationId: 'org-1',
  supervisorId: 'user-1',
  createdBy: 'user-1',
  status: 'ACTIVE' as any,
  clientName: 'Test Client',
  clientType: 'CORPORATE' as any,
  constructionType: '新築',
  location: 'Tokyo',
  locationPoint: null,
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  organization: { id: 'org-1', name: 'Test Org' },
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ProjectsService', () => {
  let service: ProjectsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('必須フィールド揃いで正常にプロジェクトを作成する', async () => {
      mockPrismaService.project.create.mockResolvedValue(mockProject);

      const dto = {
        name: 'Test Project',
        code: 'PRJ-001',
        organizationId: 'org-1',
        supervisorId: 'user-1',
        createdBy: 'user-1',
        status: 'ACTIVE' as any,
        clientName: 'Test Client',
        clientType: 'CORPORATE' as any,
        constructionType: '新築',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      };

      const result = await service.create(dto);

      expect(mockPrismaService.project.create).toHaveBeenCalled();
      expect(result).toEqual(mockProject);
    });
  });

  describe('findAll', () => {
    it('プロジェクト一覧を返す', async () => {
      mockPrismaService.project.findMany.mockResolvedValue([mockProject]);

      const result = await service.findAll();

      expect(mockPrismaService.project.findMany).toHaveBeenCalled();
      expect(result).toEqual([mockProject]);
    });

    it('organizationIdフィルター付きで一覧を返す', async () => {
      mockPrismaService.project.findMany.mockResolvedValue([mockProject]);

      const result = await service.findAll({ organizationId: 'org-1' });

      expect(mockPrismaService.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId: 'org-1' } }),
      );
      expect(result).toEqual([mockProject]);
    });
  });

  describe('findOne', () => {
    it('存在するIDでプロジェクトを返す', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);

      const result = await service.findOne('project-1');

      expect(mockPrismaService.project.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'project-1' } }),
      );
      expect(result).toEqual(mockProject);
    });

    it('存在しないIDでNotFoundExceptionをスローする', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('正常にプロジェクトを更新する', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      const updatedProject = { ...mockProject, name: 'Updated Project' };
      mockPrismaService.project.update.mockResolvedValue(updatedProject);

      const result = await service.update('project-1', { name: 'Updated Project' });

      expect(mockPrismaService.project.update).toHaveBeenCalled();
      expect(result.name).toBe('Updated Project');
    });
  });

  describe('getStatistics', () => {
    it('プロジェクトの統計情報を返す', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.photo.aggregate.mockResolvedValue({
        _count: { _all: 42 },
        _sum: { fileSize: BigInt(1048576) },
      });
      mockPrismaService.photoFolder.count.mockResolvedValue(5);

      const result = await service.getStatistics('project-1');

      expect(result.totalPhotos).toBe(42);
      expect(result.totalFolders).toBe(5);
      expect(result.storageBytes).toBe(1048576);
    });

    it('写真がない場合はゼロ値を返す', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.photo.aggregate.mockResolvedValue({
        _count: { _all: 0 },
        _sum: { fileSize: null },
      });
      mockPrismaService.photoFolder.count.mockResolvedValue(0);

      const result = await service.getStatistics('project-1');

      expect(result.totalPhotos).toBe(0);
      expect(result.totalFolders).toBe(0);
      expect(result.storageBytes).toBe(0);
    });

    it('存在しないプロジェクトIDでNotFoundExceptionをスローする', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(null);

      await expect(service.getStatistics('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
