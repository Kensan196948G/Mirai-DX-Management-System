import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

import { SchedulesService } from './schedules.service';
import type { CreateScheduleDto, UpdateScheduleDto } from './schedules.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import type { Schedule } from '@prisma/client';

@ApiTags('schedules')
@Controller()
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiBearerAuth('JWT-auth')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post('projects/:projectId/schedules')
  @Roles('SYSTEM_ADMIN', 'BRANCH_ADMIN', 'SUPERVISOR')
  @ApiOperation({ summary: 'Create a schedule for a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 201, description: 'Schedule created' })
  async create(
    @Param('projectId') projectId: string,
    @Body() dto: Omit<CreateScheduleDto, 'projectId'>,
  ): Promise<Schedule> {
    return this.schedulesService.create({ ...dto, projectId });
  }

  @Get('projects/:projectId/schedules')
  @Roles('SYSTEM_ADMIN', 'BRANCH_ADMIN', 'SUPERVISOR')
  @ApiOperation({ summary: 'Get schedules for a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Schedules retrieved' })
  async findByProject(@Param('projectId') projectId: string): Promise<Schedule[]> {
    return this.schedulesService.findByProject(projectId);
  }

  @Get('schedules/:id')
  @Roles('SYSTEM_ADMIN', 'BRANCH_ADMIN', 'SUPERVISOR')
  @ApiOperation({ summary: 'Get schedule by ID' })
  @ApiParam({ name: 'id', description: 'Schedule ID' })
  @ApiResponse({ status: 200, description: 'Schedule retrieved' })
  @ApiResponse({ status: 404, description: 'Schedule not found' })
  async findOne(@Param('id') id: string): Promise<Schedule> {
    return this.schedulesService.findOne(id);
  }

  @Patch('schedules/:id')
  @Roles('SYSTEM_ADMIN', 'BRANCH_ADMIN', 'SUPERVISOR')
  @ApiOperation({ summary: 'Update a schedule' })
  @ApiParam({ name: 'id', description: 'Schedule ID' })
  @ApiResponse({ status: 200, description: 'Schedule updated' })
  async update(@Param('id') id: string, @Body() dto: UpdateScheduleDto): Promise<Schedule> {
    return this.schedulesService.update(id, dto);
  }

  @Patch('schedules/:id/progress')
  @Roles('SYSTEM_ADMIN', 'BRANCH_ADMIN', 'SUPERVISOR')
  @ApiOperation({ summary: 'Update schedule progress rate' })
  @ApiParam({ name: 'id', description: 'Schedule ID' })
  @ApiResponse({ status: 200, description: 'Progress updated' })
  async updateProgress(
    @Param('id') id: string,
    @Body('progress') progress: number,
  ): Promise<Schedule> {
    return this.schedulesService.updateProgress(id, progress);
  }

  @Delete('schedules/:id')
  @Roles('SYSTEM_ADMIN', 'BRANCH_ADMIN', 'SUPERVISOR')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a schedule' })
  @ApiParam({ name: 'id', description: 'Schedule ID' })
  @ApiResponse({ status: 204, description: 'Schedule deleted' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.schedulesService.remove(id);
  }
}
