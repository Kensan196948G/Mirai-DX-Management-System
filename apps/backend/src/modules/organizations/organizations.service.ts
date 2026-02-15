import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

import type { Organization, OrgType } from '@prisma/client';

export interface CreateOrganizationDto {
  name: string;
  type: OrgType;
  parentId?: string;
  code?: string;
  address?: string;
  phoneNumber?: string;
}

export interface UpdateOrganizationDto {
  name?: string;
  code?: string;
  address?: string;
  phoneNumber?: string;
  isActive?: boolean;
}

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new organization
   */
  async create(dto: CreateOrganizationDto): Promise<Organization> {
    // Validate parent organization exists if parentId is provided
    if (dto.parentId) {
      await this.findOne(dto.parentId);
    }

    // Check for duplicate code
    if (dto.code) {
      const existing = await this.prisma.organization.findUnique({
        where: { code: dto.code },
      });

      if (existing) {
        throw new ConflictException(`Organization code already exists: ${dto.code}`);
      }
    }

    const organization = await this.prisma.organization.create({
      data: {
        name: dto.name,
        type: dto.type,
        parentId: dto.parentId,
        code: dto.code,
        address: dto.address,
        phoneNumber: dto.phoneNumber,
        isActive: true,
      },
      include: {
        parent: true,
        children: true,
      },
    });

    this.logger.log(`Organization created: ${organization.id} (${organization.name})`);

    return organization;
  }

  /**
   * Find all organizations
   */
  async findAll(): Promise<Organization[]> {
    return this.prisma.organization.findMany({
      include: {
        parent: true,
        children: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Find organization by ID
   */
  async findOne(id: string): Promise<Organization> {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        users: {
          include: {
            roles: true,
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException(`Organization not found: ${id}`);
    }

    return organization;
  }

  /**
   * Find organization hierarchy (tree structure)
   */
  async findHierarchy(rootId?: string): Promise<Organization[]> {
    const whereClause = rootId ? { id: rootId } : { parentId: null };

    return this.prisma.organization.findMany({
      where: whereClause,
      include: {
        children: {
          include: {
            children: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Update organization
   */
  async update(id: string, dto: UpdateOrganizationDto): Promise<Organization> {
    await this.findOne(id);

    // Check for duplicate code if changed
    if (dto.code) {
      const existing = await this.prisma.organization.findUnique({
        where: { code: dto.code },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException(`Organization code already exists: ${dto.code}`);
      }
    }

    const organization = await this.prisma.organization.update({
      where: { id },
      data: dto,
      include: {
        parent: true,
        children: true,
      },
    });

    this.logger.log(`Organization updated: ${id}`);

    return organization;
  }

  /**
   * Soft delete organization (deactivate)
   */
  async remove(id: string): Promise<Organization> {
    await this.findOne(id);

    // Check if organization has active children
    const children = await this.prisma.organization.count({
      where: {
        parentId: id,
        isActive: true,
      },
    });

    if (children > 0) {
      throw new ConflictException('Cannot deactivate organization with active children');
    }

    const organization = await this.prisma.organization.update({
      where: { id },
      data: {
        isActive: false,
      },
      include: {
        parent: true,
        children: true,
      },
    });

    this.logger.log(`Organization deactivated: ${id}`);

    return organization;
  }
}
