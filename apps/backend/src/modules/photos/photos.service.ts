import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Prisma } from '@prisma/client';
import * as sharp from 'sharp';
import { randomBytes } from 'crypto';

import type { Photo } from '@prisma/client';

export interface UploadPhotoDto {
  projectId: string;
  folderId?: string;
  uploadedBy: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  latitude?: number;
  longitude?: number;
  takenAt?: Date;
  exifData?: Record<string, unknown>;
  tags?: string[];
  description?: string;
}

export interface PhotoSearchDto {
  projectId?: string;
  folderId?: string;
  uploadedBy?: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  takenAtFrom?: Date;
  takenAtTo?: Date;
  tags?: string[];
  query?: string;
}

@Injectable()
export class PhotosService {
  private readonly logger = new Logger(PhotosService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    // Initialize S3 client
    this.s3Client = new S3Client({
      region: this.configService.get<string>('aws.region'),
      endpoint: this.configService.get<string>('aws.s3.endpoint'),
      credentials: {
        accessKeyId: this.configService.get<string>('aws.accessKeyId') ?? '',
        secretAccessKey: this.configService.get<string>('aws.secretAccessKey') ?? '',
      },
      forcePathStyle: this.configService.get<boolean>('aws.s3.forcePathStyle', false),
    });

    this.bucketName = this.configService.get<string>('aws.s3.bucketName') ?? 'cdcp-photos';
  }

  /**
   * Generate unique S3 key
   */
  private generateS3Key(projectId: string, fileName: string): string {
    const timestamp = Date.now();
    const random = randomBytes(8).toString('hex');
    const extension = fileName.split('.').pop();
    return `projects/${projectId}/${timestamp}-${random}.${extension}`;
  }

  /**
   * Upload photo to S3 and create database record
   */
  async upload(dto: UploadPhotoDto, buffer: Buffer): Promise<Photo> {
    // Generate S3 key
    const s3Key = this.generateS3Key(dto.projectId, dto.fileName);

    try {
      // Generate thumbnail
      const thumbnail = await sharp(buffer).resize(200, 200, { fit: 'cover' }).jpeg().toBuffer();

      const thumbnailKey = s3Key.replace(/\.[^.]+$/, '_thumb.jpg');

      // Upload original to S3
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: s3Key,
          Body: buffer,
          ContentType: dto.mimeType,
          Metadata: {
            projectId: dto.projectId,
            uploadedBy: dto.uploadedBy,
          },
        }),
      );

      // Upload thumbnail to S3
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: thumbnailKey,
          Body: thumbnail,
          ContentType: 'image/jpeg',
        }),
      );

      // Create database record
      const photo = await this.prisma.photo.create({
        data: {
          s3Key,
          thumbnailS3Key: thumbnailKey,
          projectId: dto.projectId,
          folderId: dto.folderId,
          uploadedBy: dto.uploadedBy,
          fileName: dto.fileName,
          mimeType: dto.mimeType,
          fileSizeBytes: dto.fileSizeBytes,
          locationPoint:
            dto.latitude && dto.longitude
              ? Prisma.sql`ST_SetSRID(ST_MakePoint(${dto.longitude}, ${dto.latitude}), 4326)::geography`
              : null,
          takenAt: dto.takenAt ?? new Date(),
          exifData: dto.exifData ?? Prisma.JsonNull,
          description: dto.description,
          tags: dto.tags
            ? {
                create: dto.tags.map((tagName) => ({
                  tag: {
                    connectOrCreate: {
                      where: { name: tagName },
                      create: { name: tagName },
                    },
                  },
                })),
              }
            : undefined,
        },
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
          folder: true,
          uploader: true,
        },
      });

      this.logger.log(`Photo uploaded: ${photo.id} (${s3Key})`);

      return photo;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to upload photo: ${errorMessage}`);
      throw new BadRequestException('Failed to upload photo');
    }
  }

  /**
   * Get presigned URL for photo download
   */
  async getPresignedUrl(id: string, expiresIn = 3600): Promise<string> {
    const photo = await this.findOne(id);

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: photo.s3Key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  /**
   * Get presigned URL for thumbnail download
   */
  async getThumbnailUrl(id: string, expiresIn = 3600): Promise<string> {
    const photo = await this.findOne(id);

    if (!photo.thumbnailS3Key) {
      throw new NotFoundException('Thumbnail not found');
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: photo.thumbnailS3Key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  /**
   * Search photos
   */
  async search(search: PhotoSearchDto): Promise<Photo[]> {
    const where: Prisma.PhotoWhereInput = {};

    if (search.projectId) {
      where.projectId = search.projectId;
    }

    if (search.folderId) {
      where.folderId = search.folderId;
    }

    if (search.uploadedBy) {
      where.uploadedBy = search.uploadedBy;
    }

    if (search.takenAtFrom || search.takenAtTo) {
      where.takenAt = {
        ...(search.takenAtFrom && { gte: search.takenAtFrom }),
        ...(search.takenAtTo && { lte: search.takenAtTo }),
      };
    }

    if (search.tags && search.tags.length > 0) {
      where.tags = {
        some: {
          tag: {
            name: {
              in: search.tags,
            },
          },
        },
      };
    }

    if (search.query) {
      where.OR = [
        { fileName: { contains: search.query, mode: 'insensitive' } },
        { description: { contains: search.query, mode: 'insensitive' } },
      ];
    }

    // If location search is provided, use raw SQL for PostGIS distance query
    if (search.latitude && search.longitude && search.radiusMeters) {
      const photos = await this.prisma.$queryRaw<Photo[]>`
        SELECT p.*
        FROM "Photo" p
        WHERE p."locationPoint" IS NOT NULL
        AND ST_DWithin(
          p."locationPoint"::geography,
          ST_SetSRID(ST_MakePoint(${search.longitude}, ${search.latitude}), 4326)::geography,
          ${search.radiusMeters}
        )
        ORDER BY p."takenAt" DESC
      `;

      return photos;
    }

    return this.prisma.photo.findMany({
      where,
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        folder: true,
        uploader: true,
      },
      orderBy: {
        takenAt: 'desc',
      },
    });
  }

  /**
   * Find photo by ID
   */
  async findOne(id: string): Promise<Photo> {
    const photo = await this.prisma.photo.findUnique({
      where: { id },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        folder: true,
        uploader: true,
        comments: {
          include: {
            user: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!photo) {
      throw new NotFoundException(`Photo not found: ${id}`);
    }

    return photo;
  }

  /**
   * Delete photo
   */
  async remove(id: string): Promise<void> {
    const photo = await this.findOne(id);

    // Delete from S3
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: photo.s3Key,
        }),
      );

      if (photo.thumbnailS3Key) {
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: photo.thumbnailS3Key,
          }),
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to delete from S3: ${errorMessage}`);
    }

    // Delete from database
    await this.prisma.photo.delete({
      where: { id },
    });

    this.logger.log(`Photo deleted: ${id}`);
  }
}
