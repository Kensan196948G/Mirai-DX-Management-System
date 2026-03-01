import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

import type { User } from '@prisma/client';
import type { RoleName } from '@prisma/client';

export interface CreateUserDto {
  auth0UserId: string;
  email: string;
  name: string;
  organizationId: string;
  roles: RoleName[];
  employeeCode?: string;
}

export interface UpdateUserDto {
  name?: string;
  isActive?: boolean;
  roles?: RoleName[];
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new user
   */
  async create(dto: CreateUserDto): Promise<User> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { auth0UserId: dto.auth0UserId },
    });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    // Create user with roles
    const user = await this.prisma.user.create({
      data: {
        auth0UserId: dto.auth0UserId,
        email: dto.email,
        name: dto.name,
        employeeCode: dto.employeeCode,
        organizationId: dto.organizationId,
        isActive: true,
        roles: {
          create: dto.roles.map((roleName) => ({
            role: { connect: { name: roleName } },
          })),
        },
      },
      include: {
        roles: true,
        organization: true,
      },
    });

    this.logger.log(`User created: ${user.id} (${user.email})`);

    return user;
  }

  /**
   * Find all users (with optional organization filter)
   */
  async findAll(organizationId?: string): Promise<User[]> {
    return this.prisma.user.findMany({
      where: organizationId ? { organizationId } : undefined,
      include: {
        roles: true,
        organization: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Find user by ID
   */
  async findOne(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        roles: true,
        organization: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User not found: ${id}`);
    }

    return user;
  }

  /**
   * Find user by Auth0 User ID
   */
  async findByAuth0UserId(auth0UserId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { auth0UserId },
      include: {
        roles: true,
        organization: true,
      },
    });
  }

  /**
   * Update user
   */
  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    // Update user
    await this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name ?? user.name,
        isActive: dto.isActive ?? user.isActive,
      },
      include: {
        roles: true,
        organization: true,
      },
    });

    // Update roles if provided
    if (dto.roles) {
      // Delete existing roles
      await this.prisma.userRole.deleteMany({
        where: { userId: id },
      });

      // Create new roles
      const roleRecords = await this.prisma.role.findMany({
        where: { name: { in: dto.roles } },
      });
      await this.prisma.userRole.createMany({
        data: roleRecords.map((r) => ({ userId: id, roleId: r.id })),
      });
    }

    this.logger.log(`User updated: ${id}`);

    return this.findOne(id);
  }

  /**
   * Soft delete user (deactivate)
   */
  async remove(id: string): Promise<User> {
    await this.findOne(id);

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        isActive: false,
      },
      include: {
        roles: true,
        organization: true,
      },
    });

    this.logger.log(`User deactivated: ${id}`);

    return user;
  }

  /**
   * Hard delete user (permanent)
   */
  async hardDelete(id: string): Promise<void> {
    await this.findOne(id);

    await this.prisma.user.delete({
      where: { id },
    });

    this.logger.warn(`User permanently deleted: ${id}`);
  }
}
