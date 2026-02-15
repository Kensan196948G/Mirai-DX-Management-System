import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';

import type { Project, ProjectStatus } from '@prisma/client';

export interface CreateProjectDto {
  name: string;
  code: string;
  organizationId: string;
  status: ProjectStatus;
  clientName?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  startDate?: Date;
  endDate?: Date;
  description?: string;
}

export interface UpdateProjectDto {
  name?: string;
  code?: string;
  status?: ProjectStatus;
  clientName?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  startDate?: Date;
  endDate?: Date;
  description?: string;
}

export interface ProjectSearchDto {
  organizationId?: string;
  status?: ProjectStatus;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  startDateFrom?: Date;
  startDateTo?: Date;
}

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new project
   */
  async create(dto: CreateProjectDto): Promise<Project> {
    const project = await this.prisma.project.create({
      data: {
        name: dto.name,
        code: dto.code,
        organizationId: dto.organizationId,
        status: dto.status,
        clientName: dto.clientName,
        address: dto.address,
        locationPoint:
          dto.latitude && dto.longitude
            ? Prisma.sql`ST_SetSRID(ST_MakePoint(${dto.longitude}, ${dto.latitude}), 4326)::geography`
            : null,
        startDate: dto.startDate,
        endDate: dto.endDate,
        description: dto.description,
      },
      include: {
        organization: true,
      },
    });

    this.logger.log(`Project created: ${project.id} (${project.name})`);

    return project;
  }

  /**
   * Find all projects (with optional filters)
   */
  async findAll(search?: ProjectSearchDto): Promise<Project[]> {
    const where: Prisma.ProjectWhereInput = {};

    if (search?.organizationId) {
      where.organizationId = search.organizationId;
    }

    if (search?.status) {
      where.status = search.status;
    }

    if (search?.startDateFrom || search?.startDateTo) {
      where.startDate = {
        ...(search.startDateFrom && { gte: search.startDateFrom }),
        ...(search.startDateTo && { lte: search.startDateTo }),
      };
    }

    // If location search is provided, use raw SQL for PostGIS distance query
    if (search?.latitude && search?.longitude && search?.radiusMeters) {
      const projects = await this.prisma.$queryRaw<Project[]>`
        SELECT p.*
        FROM "Project" p
        WHERE p."locationPoint" IS NOT NULL
        AND ST_DWithin(
          p."locationPoint"::geography,
          ST_SetSRID(ST_MakePoint(${search.longitude}, ${search.latitude}), 4326)::geography,
          ${search.radiusMeters}
        )
        ORDER BY p."createdAt" DESC
      `;

      return projects;
    }

    return this.prisma.project.findMany({
      where,
      include: {
        organization: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Find project by ID
   */
  async findOne(id: string): Promise<Project> {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        organization: true,
        photos: {
          orderBy: {
            takenAt: 'desc',
          },
          take: 10,
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project not found: ${id}`);
    }

    return project;
  }

  /**
   * Find project by code
   */
  async findByCode(code: string): Promise<Project | null> {
    return this.prisma.project.findUnique({
      where: { code },
      include: {
        organization: true,
      },
    });
  }

  /**
   * Update project
   */
  async update(id: string, dto: UpdateProjectDto): Promise<Project> {
    await this.findOne(id);

    const project = await this.prisma.project.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        status: dto.status,
        clientName: dto.clientName,
        address: dto.address,
        locationPoint:
          dto.latitude !== undefined && dto.longitude !== undefined
            ? Prisma.sql`ST_SetSRID(ST_MakePoint(${dto.longitude}, ${dto.latitude}), 4326)::geography`
            : undefined,
        startDate: dto.startDate,
        endDate: dto.endDate,
        description: dto.description,
      },
      include: {
        organization: true,
      },
    });

    this.logger.log(`Project updated: ${id}`);

    return project;
  }

  /**
   * Delete project (hard delete)
   */
  async remove(id: string): Promise<void> {
    await this.findOne(id);

    await this.prisma.project.delete({
      where: { id },
    });

    this.logger.log(`Project deleted: ${id}`);
  }

  /**
   * Get project statistics
   */
  async getStatistics(
    projectId: string,
  ): Promise<{ totalPhotos: number; totalFolders: number; storageBytes: number }> {
    // Verify project exists (throws NotFoundException if not found)
    await this.findOne(projectId);

    const stats = await this.prisma.photo.aggregate({
      where: { projectId },
      _count: true,
      _sum: {
        fileSizeBytes: true,
      },
    });

    const folders = await this.prisma.photoFolder.count({
      where: { projectId },
    });

    return {
      totalPhotos: stats._count,
      totalFolders: folders,
      storageBytes: stats._sum.fileSizeBytes ?? 0,
    };
  }
}
