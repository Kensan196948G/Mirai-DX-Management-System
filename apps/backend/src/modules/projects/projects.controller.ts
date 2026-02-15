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

import { ProjectsService } from './projects.service';
import type { CreateProjectDto, UpdateProjectDto, ProjectSearchDto } from './projects.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';

import type { Project } from '@prisma/client';

@ApiTags('projects')
@Controller('projects')
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiBearerAuth('JWT-auth')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  /**
   * Create a new project
   */
  @Post()
  @Roles('system_admin', 'branch_admin', 'supervisor')
  @Permissions('write:projects')
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({ status: 201, description: 'Project created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(@Body() dto: CreateProjectDto): Promise<Project> {
    return this.projectsService.create(dto);
  }

  /**
   * Get all projects with optional filters
   */
  @Get()
  @Permissions('read:projects')
  @ApiOperation({ summary: 'Get all projects' })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'latitude', required: false })
  @ApiQuery({ name: 'longitude', required: false })
  @ApiQuery({ name: 'radiusMeters', required: false })
  @ApiResponse({ status: 200, description: 'Projects retrieved successfully' })
  async findAll(@Query() search?: ProjectSearchDto): Promise<Project[]> {
    return this.projectsService.findAll(search);
  }

  /**
   * Get project by ID
   */
  @Get(':id')
  @Permissions('read:projects')
  @ApiOperation({ summary: 'Get project by ID' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Project retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async findOne(@Param('id') id: string): Promise<Project> {
    return this.projectsService.findOne(id);
  }

  /**
   * Get project statistics
   */
  @Get(':id/statistics')
  @Permissions('read:projects')
  @ApiOperation({ summary: 'Get project statistics' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStatistics(
    @Param('id') id: string,
  ): Promise<{ totalPhotos: number; totalFolders: number; storageBytes: number }> {
    return this.projectsService.getStatistics(id);
  }

  /**
   * Update project
   */
  @Patch(':id')
  @Roles('system_admin', 'branch_admin', 'supervisor')
  @Permissions('write:projects')
  @ApiOperation({ summary: 'Update project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Project updated successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async update(@Param('id') id: string, @Body() dto: UpdateProjectDto): Promise<Project> {
    return this.projectsService.update(id, dto);
  }

  /**
   * Delete project
   */
  @Delete(':id')
  @Roles('system_admin', 'branch_admin')
  @Permissions('delete:projects')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({ status: 204, description: 'Project deleted successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.projectsService.remove(id);
  }
}
