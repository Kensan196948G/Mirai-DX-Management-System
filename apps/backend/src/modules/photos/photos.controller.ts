import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';

import { PhotosService } from './photos.service';
import type { UploadPhotoDto, PhotoSearchDto } from './photos.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

import type { Photo } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('photos')
@Controller('photos')
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiBearerAuth('JWT-auth')
export class PhotosController {
  constructor(private readonly photosService: PhotosService) {}

  /**
   * Upload a photo
   */
  @Post('upload')
  @Permissions('write:photos')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } })) // 50MB max
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a photo' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        projectId: { type: 'string' },
        folderId: { type: 'string', nullable: true },
        latitude: { type: 'number', nullable: true },
        longitude: { type: 'number', nullable: true },
        takenAt: { type: 'string', format: 'date-time', nullable: true },
        exifData: { type: 'object', nullable: true },
        tags: { type: 'array', items: { type: 'string' }, nullable: true },
        description: { type: 'string', nullable: true },
      },
      required: ['file', 'projectId'],
    },
  })
  @ApiResponse({ status: 201, description: 'Photo uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or file too large' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
    @Query('projectId') projectId?: string,
    @Query('folderId') folderId?: string,
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
    @Query('takenAt') takenAt?: string,
    @Query('exifData') exifData?: string,
    @Query('tags') tags?: string,
    @Query('description') description?: string,
  ): Promise<Photo> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!projectId) {
      throw new BadRequestException('projectId is required');
    }

    if (!user.userId) {
      throw new BadRequestException('User ID not found');
    }

    const dto: UploadPhotoDto = {
      projectId,
      folderId,
      uploadedBy: user.userId,
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      takenAt: takenAt ? new Date(takenAt) : undefined,
      exifData: exifData ? JSON.parse(exifData) : undefined,
      tags: tags ? JSON.parse(tags) : undefined,
      description,
    };

    return this.photosService.upload(dto, file.buffer);
  }

  /**
   * Search photos
   */
  @Get('search')
  @Permissions('read:photos')
  @ApiOperation({ summary: 'Search photos' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'folderId', required: false })
  @ApiQuery({ name: 'uploadedBy', required: false })
  @ApiQuery({ name: 'latitude', required: false })
  @ApiQuery({ name: 'longitude', required: false })
  @ApiQuery({ name: 'radiusMeters', required: false })
  @ApiQuery({ name: 'takenAtFrom', required: false })
  @ApiQuery({ name: 'takenAtTo', required: false })
  @ApiQuery({ name: 'tags', required: false })
  @ApiQuery({ name: 'query', required: false })
  @ApiResponse({ status: 200, description: 'Photos retrieved successfully' })
  async search(@Query() search: PhotoSearchDto): Promise<Photo[]> {
    return this.photosService.search(search);
  }

  /**
   * Get photo by ID
   */
  @Get(':id')
  @Permissions('read:photos')
  @ApiOperation({ summary: 'Get photo by ID' })
  @ApiParam({ name: 'id', description: 'Photo ID' })
  @ApiResponse({ status: 200, description: 'Photo retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Photo not found' })
  async findOne(@Param('id') id: string): Promise<Photo> {
    return this.photosService.findOne(id);
  }

  /**
   * Get presigned URL for photo download
   */
  @Get(':id/download')
  @Permissions('read:photos')
  @ApiOperation({ summary: 'Get presigned URL for photo download' })
  @ApiParam({ name: 'id', description: 'Photo ID' })
  @ApiResponse({ status: 200, description: 'Presigned URL generated' })
  @ApiResponse({ status: 404, description: 'Photo not found' })
  async getPresignedUrl(@Param('id') id: string): Promise<{ url: string }> {
    const url = await this.photosService.getPresignedUrl(id);
    return { url };
  }

  /**
   * Get presigned URL for thumbnail download
   */
  @Get(':id/thumbnail')
  @Permissions('read:photos')
  @ApiOperation({ summary: 'Get presigned URL for thumbnail' })
  @ApiParam({ name: 'id', description: 'Photo ID' })
  @ApiResponse({ status: 200, description: 'Thumbnail URL generated' })
  @ApiResponse({ status: 404, description: 'Photo not found' })
  async getThumbnailUrl(@Param('id') id: string): Promise<{ url: string }> {
    const url = await this.photosService.getThumbnailUrl(id);
    return { url };
  }

  /**
   * Delete photo
   */
  @Delete(':id')
  @Permissions('delete:photos')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete photo' })
  @ApiParam({ name: 'id', description: 'Photo ID' })
  @ApiResponse({ status: 204, description: 'Photo deleted successfully' })
  @ApiResponse({ status: 404, description: 'Photo not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.photosService.remove(id);
  }
}
