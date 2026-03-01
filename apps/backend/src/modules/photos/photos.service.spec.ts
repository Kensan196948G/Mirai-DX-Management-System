import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PhotosService } from './photos.service';
import { PrismaService } from '../../database/prisma.service';

// S3 SDK モック
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({ send: mockS3Send })),
  PutObjectCommand: jest.fn((params) => ({ ...params, _type: 'PutObject' })),
  GetObjectCommand: jest.fn((params) => ({ ...params, _type: 'GetObject' })),
  DeleteObjectCommand: jest.fn((params) => ({ ...params, _type: 'DeleteObject' })),
}));

// presigned URL モック
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://s3.example.com/presigned-url'),
}));

// sharp モック（サムネイル生成）
jest.mock('sharp', () =>
  jest.fn(() => ({
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('thumbnail-data')),
  })),
);

const mockS3Send = jest.fn().mockResolvedValue({});

const mockPrismaService = {
  photo: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
  $queryRaw: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string, defaultVal?: unknown) => {
    const config: Record<string, unknown> = {
      'aws.region': 'ap-northeast-1',
      'aws.s3.endpoint': undefined,
      'aws.accessKeyId': 'test-key',
      'aws.secretAccessKey': 'test-secret',
      'aws.s3.forcePathStyle': false,
      'aws.s3.bucketName': 'test-bucket',
    };
    return config[key] ?? defaultVal;
  }),
};

describe('PhotosService', () => {
  let service: PhotosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PhotosService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PhotosService>(PhotosService);
    jest.clearAllMocks();
    mockS3Send.mockResolvedValue({});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upload()', () => {
    const uploadDto = {
      projectId: 'project-1',
      uploadedBy: 'user-1',
      fileName: 'test.jpg',
      mimeType: 'image/jpeg',
      fileSize: 1024,
    };
    const buffer = Buffer.from('fake-image-data');

    it('S3 putObject が2回呼ばれること（オリジナル + サムネイル）', async () => {
      const mockPhoto = {
        id: 'photo-1',
        s3Key: 'projects/project-1/123-abc.jpg',
        thumbnailS3Key: 'projects/project-1/123-abc_thumb.jpg',
        projectId: 'project-1',
        tags: [],
        folder: null,
        uploader: null,
      };
      mockPrismaService.photo.create.mockResolvedValue(mockPhoto);

      await service.upload(uploadDto, buffer);

      expect(mockS3Send).toHaveBeenCalledTimes(2);
    });

    it('Photo レコードが作成されること（prisma.photo.create が呼ばれる）', async () => {
      const mockPhoto = {
        id: 'photo-1',
        s3Key: 'projects/project-1/123-abc.jpg',
        thumbnailS3Key: 'projects/project-1/123-abc_thumb.jpg',
        projectId: 'project-1',
        tags: [],
        folder: null,
        uploader: null,
      };
      mockPrismaService.photo.create.mockResolvedValue(mockPhoto);

      const result = await service.upload(uploadDto, buffer);

      expect(mockPrismaService.photo.create).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.photo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            projectId: 'project-1',
            uploadedBy: 'user-1',
            fileName: 'test.jpg',
          }),
        }),
      );
      expect(result).toEqual(mockPhoto);
    });

    it('S3アップロード失敗時に BadRequestException をスローすること', async () => {
      mockS3Send.mockRejectedValueOnce(new Error('S3 upload failed'));

      await expect(service.upload(uploadDto, buffer)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByProject() / search()', () => {
    it('プロジェクトの写真一覧を返すこと', async () => {
      const mockPhotos = [
        {
          id: 'photo-1',
          projectId: 'project-1',
          fileName: 'photo1.jpg',
          tags: [],
          folder: null,
          uploader: null,
        },
        {
          id: 'photo-2',
          projectId: 'project-1',
          fileName: 'photo2.jpg',
          tags: [],
          folder: null,
          uploader: null,
        },
      ];
      mockPrismaService.photo.findMany.mockResolvedValue(mockPhotos);

      const result = await service.search({ projectId: 'project-1' });

      expect(mockPrismaService.photo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ projectId: 'project-1' }),
        }),
      );
      expect(result).toHaveLength(2);
      expect(result[0]?.projectId).toBe('project-1');
    });

    it('検索条件なしで全写真を返すこと', async () => {
      mockPrismaService.photo.findMany.mockResolvedValue([]);

      await service.search({});

      expect(mockPrismaService.photo.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('getPresignedUrl() / getSignedUrl()', () => {
    it('S3 getSignedUrl が呼ばれること（presigned URL）', async () => {
      const { getSignedUrl } = jest.requireMock('@aws-sdk/s3-request-presigner');
      const mockPhoto = {
        id: 'photo-1',
        s3Key: 'projects/project-1/test.jpg',
        thumbnailS3Key: 'projects/project-1/test_thumb.jpg',
        tags: [],
        folder: null,
        uploader: null,
        comments: [],
      };
      mockPrismaService.photo.findUnique.mockResolvedValue(mockPhoto);

      const url = await service.getPresignedUrl('photo-1');

      expect(getSignedUrl).toHaveBeenCalledTimes(1);
      expect(url).toBe('https://s3.example.com/presigned-url');
    });

    it('存在しない写真ID の場合 NotFoundException をスローすること', async () => {
      mockPrismaService.photo.findUnique.mockResolvedValue(null);

      await expect(service.getPresignedUrl('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
