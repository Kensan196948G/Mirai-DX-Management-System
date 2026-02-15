import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';

import type { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import type { User, UserRole as PrismaUserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get or create user from Auth0 profile
   *
   * @param auth0UserId - Auth0 User ID
   * @param email - User email
   * @returns User record with roles
   */
  async getOrCreateUser(
    auth0UserId: string,
    email: string,
  ): Promise<User & { roles: Array<{ role: PrismaUserRole['role'] }> }> {
    // Try to find existing user
    const user = await this.prisma.user.findUnique({
      where: { auth0UserId },
      include: {
        roles: true,
      },
    });

    if (user) {
      this.logger.log(`User found: ${user.id} (${email})`);
      return user;
    }

    // Create new user (requires organizationId to be set externally)
    // In production, this would be set by an admin during user provisioning
    this.logger.warn(`User not found in database: ${auth0UserId} (${email})`);
    throw new UnauthorizedException(
      'User not found. Please contact your administrator to provision your account.',
    );
  }

  /**
   * Enrich AuthenticatedUser with database user data
   *
   * @param authenticatedUser - User from JWT token
   * @returns Enriched user with roles and organization
   */
  async enrichUser(authenticatedUser: AuthenticatedUser): Promise<AuthenticatedUser> {
    const user = await this.getOrCreateUser(authenticatedUser.auth0UserId, authenticatedUser.email);

    return {
      ...authenticatedUser,
      userId: user.id,
      organizationId: user.organizationId ?? undefined,
      roles: user.roles.map((role) => role.role as string),
    };
  }

  /**
   * Validate user permissions
   *
   * @param userId - User ID
   * @param requiredPermissions - Required permissions
   * @returns true if user has all required permissions
   */
  async validatePermissions(userId: string, requiredPermissions: string[]): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: true,
      },
    });

    if (!user || !user.isActive) {
      return false;
    }

    // Map roles to permissions (this would be more sophisticated in production)
    const rolePermissionsMap: Record<string, string[]> = {
      system_admin: ['*'], // Full access
      branch_admin: [
        'read:projects',
        'write:projects',
        'read:photos',
        'write:photos',
        'read:users',
        'write:users',
        'read:organizations',
      ],
      supervisor: ['read:projects', 'write:projects', 'read:photos', 'write:photos'],
      worker: ['read:photos', 'write:photos'],
      viewer: ['read:photos', 'read:projects'],
    };

    const userPermissions = user.roles.flatMap((role) => rolePermissionsMap[role.role] ?? []);

    // System admin has all permissions
    if (userPermissions.includes('*')) {
      return true;
    }

    // Check if user has all required permissions
    return requiredPermissions.every((permission) => userPermissions.includes(permission));
  }

  /**
   * Log user activity for audit trail
   *
   * @param userId - User ID
   * @param action - Action performed
   * @param entityType - Entity type
   * @param entityId - Entity ID
   * @param metadata - Additional metadata
   */
  async logActivity(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        metadata: metadata ?? {},
        ipAddress: null,
        userAgent: null,
      },
    });

    this.logger.log(`Activity logged: ${userId} - ${action} - ${entityType}:${entityId}`);
  }
}
