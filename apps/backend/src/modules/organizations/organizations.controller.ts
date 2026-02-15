import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import { OrganizationsService } from './organizations.service';
import type { CreateOrganizationDto, UpdateOrganizationDto } from './organizations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';

import type { Organization } from '@prisma/client';

@ApiTags('organizations')
@Controller('organizations')
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiBearerAuth('JWT-auth')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  /**
   * Create a new organization (admin only)
   */
  @Post()
  @Roles('system_admin')
  @Permissions('write:organizations')
  @ApiOperation({ summary: 'Create a new organization' })
  @ApiResponse({ status: 201, description: 'Organization created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 409, description: 'Organization code already exists' })
  async create(@Body() dto: CreateOrganizationDto): Promise<Organization> {
    return this.organizationsService.create(dto);
  }

  /**
   * Get all organizations
   */
  @Get()
  @Permissions('read:organizations')
  @ApiOperation({ summary: 'Get all organizations' })
  @ApiResponse({ status: 200, description: 'Organizations retrieved successfully' })
  async findAll(): Promise<Organization[]> {
    return this.organizationsService.findAll();
  }

  /**
   * Get organization hierarchy
   */
  @Get('hierarchy')
  @Permissions('read:organizations')
  @ApiOperation({ summary: 'Get organization hierarchy tree' })
  @ApiQuery({ name: 'rootId', required: false, description: 'Root organization ID' })
  @ApiResponse({ status: 200, description: 'Organization hierarchy retrieved' })
  async findHierarchy(@Query('rootId') rootId?: string): Promise<Organization[]> {
    return this.organizationsService.findHierarchy(rootId);
  }

  /**
   * Get organization by ID
   */
  @Get(':id')
  @Permissions('read:organizations')
  @ApiOperation({ summary: 'Get organization by ID' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Organization retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async findOne(@Param('id') id: string): Promise<Organization> {
    return this.organizationsService.findOne(id);
  }

  /**
   * Update organization
   */
  @Patch(':id')
  @Roles('system_admin')
  @Permissions('write:organizations')
  @ApiOperation({ summary: 'Update organization' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Organization updated successfully' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async update(@Param('id') id: string, @Body() dto: UpdateOrganizationDto): Promise<Organization> {
    return this.organizationsService.update(id, dto);
  }

  /**
   * Deactivate organization (soft delete)
   */
  @Delete(':id')
  @Roles('system_admin')
  @Permissions('write:organizations')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate organization (soft delete)' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({ status: 204, description: 'Organization deactivated successfully' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 409, description: 'Cannot deactivate organization with active children' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.organizationsService.remove(id);
  }
}
